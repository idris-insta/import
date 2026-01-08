# Analytics and Dashboard endpoints - Part 3
# These provide comprehensive business intelligence

# Dashboard analytics
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(check_permission(Permission.VIEW_DASHBOARD.value))):
    # Basic counts
    total_orders = await db.import_orders.count_documents({})
    pending_orders = await db.import_orders.count_documents({
        "status": {"$in": ["Draft", "Tentative", "Confirmed", "Loaded", "Shipped", "In Transit"]}
    })
    total_suppliers = await db.suppliers.count_documents({})
    total_skus = await db.skus.count_documents({})
    
    # Financial metrics
    total_pipeline = await db.import_orders.aggregate([
        {"$match": {"status": {"$ne": "Delivered"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_value"}}}
    ]).to_list(1)
    pipeline_value = total_pipeline[0]['total'] if total_pipeline else 0
    
    # Recent orders
    recent_orders = await db.import_orders.find(
        {}, {"_id": 0, "po_number": 1, "status": 1, "total_value": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Orders by status
    status_pipeline = await db.import_orders.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    # Utilization metrics
    utilization_pipeline = await db.import_orders.aggregate([
        {"$match": {"utilization_percentage": {"$exists": True}}},
        {"$group": {
            "_id": None,
            "avg_utilization": {"$avg": "$utilization_percentage"},
            "underutilized": {
                "$sum": {"$cond": [{"$lt": ["$utilization_percentage", 70]}, 1, 0]}
            },
            "optimal": {
                "$sum": {"$cond": [
                    {"$and": [
                        {"$gte": ["$utilization_percentage", 70]},
                        {"$lte": ["$utilization_percentage", 90]}
                    ]}, 1, 0
                ]}
            },
            "overutilized": {
                "$sum": {"$cond": [{"$gt": ["$utilization_percentage", 90]}, 1, 0]}
            }
        }}
    ]).to_list(1)
    
    utilization_stats = utilization_pipeline[0] if utilization_pipeline else {
        "avg_utilization": 0, "underutilized": 0, "optimal": 0, "overutilized": 0
    }
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_suppliers": total_suppliers,
        "total_skus": total_skus,
        "pipeline_value": pipeline_value,
        "recent_orders": recent_orders,
        "orders_by_status": {item['_id']: item['count'] for item in status_pipeline},
        "utilization_stats": utilization_stats
    }

@api_router.get("/dashboard/financial-overview")
async def get_financial_overview(current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))):
    # Total value in transit
    in_transit_pipeline = await db.import_orders.aggregate([
        {"$match": {"status": {"$in": ["Shipped", "In Transit", "Arrived"]}}},
        {"$group": {"_id": "$currency", "total": {"$sum": "$total_value"}}}
    ]).to_list(100)
    
    # Payment status
    payment_summary = await db.payments.aggregate([
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$inr_amount"}
        }}
    ]).to_list(100)
    
    # FX exposure
    fx_exposure = await db.import_orders.aggregate([
        {"$match": {"status": {"$ne": "Delivered"}}},
        {"$group": {
            "_id": "$currency",
            "total_exposure": {"$sum": "$total_value"},
            "order_count": {"$sum": 1}
        }}
    ]).to_list(100)
    
    # Supplier balances
    supplier_balances = await db.suppliers.find(
        {"current_balance": {"$ne": 0}},
        {"_id": 0, "name": 1, "code": 1, "current_balance": 1, "base_currency": 1}
    ).to_list(100)
    
    return {
        "value_in_transit": {item['_id']: item['total'] for item in in_transit_pipeline},
        "payment_summary": {item['_id']: item for item in payment_summary},
        "fx_exposure": {item['_id']: item for item in fx_exposure},
        "supplier_balances": supplier_balances
    }

@api_router.get("/dashboard/logistics-overview")
async def get_logistics_overview(current_user: User = Depends(check_permission(Permission.VIEW_DASHBOARD.value))):
    # Containers by type utilization
    container_utilization = await db.import_orders.aggregate([
        {"$group": {
            "_id": "$container_type",
            "avg_utilization": {"$avg": "$utilization_percentage"},
            "count": {"$sum": 1},
            "total_weight": {"$sum": "$total_weight"},
            "total_cbm": {"$sum": "$total_cbm"}
        }}
    ]).to_list(100)
    
    # Orders arriving soon (next 7 days)
    seven_days_from_now = datetime.now(timezone.utc) + timedelta(days=7)
    arriving_soon = await db.import_orders.find({
        "eta": {"$lte": seven_days_from_now.isoformat()},
        "status": {"$in": ["Shipped", "In Transit"]}
    }, {
        "_id": 0, "po_number": 1, "eta": 1, "port_id": 1, "status": 1
    }).to_list(100)
    
    # Demurrage alerts
    demurrage_alerts = await db.import_orders.find({
        "demurrage_start": {"$exists": True},
        "status": {"$in": ["Arrived", "Customs Clearance"]}
    }, {
        "_id": 0, "po_number": 1, "demurrage_start": 1, "port_id": 1
    }).to_list(100)
    
    # Port performance
    port_performance = await db.import_orders.aggregate([
        {"$match": {"port_id": {"$exists": True}}},
        {"$group": {
            "_id": "$port_id",
            "total_orders": {"$sum": 1},
            "avg_utilization": {"$avg": "$utilization_percentage"}
        }}
    ]).to_list(100)
    
    return {
        "container_utilization": {item['_id']: item for item in container_utilization},
        "arriving_soon": arriving_soon,
        "demurrage_alerts": demurrage_alerts,
        "port_performance": {item['_id']: item for item in port_performance}
    }

@api_router.get("/dashboard/variance-analysis")
async def get_variance_analysis(current_user: User = Depends(check_permission(Permission.VIEW_ANALYTICS.value))):
    # Variance summary
    variance_summary = await db.actual_loadings.aggregate([
        {"$group": {
            "_id": None,
            "total_orders": {"$sum": 1},
            "avg_qty_variance": {"$avg": "$total_variance_quantity"},
            "avg_weight_variance": {"$avg": "$total_variance_weight"},
            "avg_value_variance": {"$avg": "$total_variance_value"},
            "positive_variances": {
                "$sum": {"$cond": [{"$gt": ["$total_variance_quantity", 0]}, 1, 0]}
            },
            "negative_variances": {
                "$sum": {"$cond": [{"$lt": ["$total_variance_quantity", 0]}, 1, 0]}
            }
        }}
    ]).to_list(1)
    
    # Top SKUs with variances
    sku_variances = await db.actual_loadings.aggregate([
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.sku_id",
            "total_variance_qty": {"$sum": "$items.variance_quantity"},
            "total_variance_value": {"$sum": "$items.variance_value"},
            "occurrence_count": {"$sum": 1}
        }},
        {"$sort": {"total_variance_qty": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    # Variance trends (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    variance_trends = await db.actual_loadings.aggregate([
        {"$match": {"created_at": {"$gte": thirty_days_ago.isoformat()}}},
        {"$group": {
            "_id": {
                "$dateToString": {
                    "format": "%Y-%m-%d",
                    "date": {"$dateFromString": {"dateString": "$created_at"}}
                }
            },
            "avg_qty_variance": {"$avg": "$total_variance_quantity"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]).to_list(30)
    
    return {
        "summary": variance_summary[0] if variance_summary else {},
        "top_sku_variances": sku_variances,
        "trends": variance_trends
    }

@api_router.get("/dashboard/cash-flow-forecast")
async def get_cash_flow_forecast(current_user: User = Depends(check_permission(Permission.VIEW_FINANCIALS.value))):
    # Next 30 days cash requirements
    thirty_days_from_now = datetime.now(timezone.utc) + timedelta(days=30)
    
    # Estimated duty payments (orders arriving)
    duty_forecasts = await db.import_orders.aggregate([
        {
            "$match": {
                "eta": {"$lte": thirty_days_from_now.isoformat()},
                "status": {"$in": ["Shipped", "In Transit", "Arrived"]}
            }
        },
        {
            "$addFields": {
                "estimated_duty": {"$multiply": ["$total_value", "$duty_rate"]}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": {"$dateFromString": {"dateString": "$eta"}}
                    }
                },
                "total_duty": {"$sum": "$estimated_duty"},
                "order_count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]).to_list(30)
    
    # Demurrage costs
    demurrage_costs = await db.import_orders.aggregate([
        {
            "$match": {
                "demurrage_start": {"$exists": True},
                "status": {"$in": ["Arrived", "Customs Clearance"]}
            }
        },
        {
            "$lookup": {
                "from": "ports",
                "localField": "port_id",
                "foreignField": "id",
                "as": "port_info"
            }
        },
        {
            "$addFields": {
                "days_in_port": {
                    "$divide": [
                        {"$subtract": [datetime.now(timezone.utc), {"$dateFromString": {"dateString": "$demurrage_start"}}]},
                        86400000  # milliseconds to days
                    ]
                },
                "demurrage_rate": {"$arrayElemAt": ["$port_info.demurrage_rate", 0]}
            }
        }
    ]).to_list(100)
    
    # Supplier payment schedules (based on credit terms)
    supplier_payments = await db.import_orders.aggregate([
        {
            "$match": {
                "status": {"$in": ["Delivered"]},
                "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()}
            }
        },
        {
            "$group": {
                "_id": "$supplier_id",
                "pending_amount": {"$sum": "$total_value"},
                "currency": {"$first": "$currency"}
            }
        }
    ]).to_list(100)
    
    return {
        "duty_forecasts": duty_forecasts,
        "demurrage_costs": demurrage_costs,
        "supplier_payments": supplier_payments,
        "forecast_period": 30
    }

# Advanced Analytics endpoints
@api_router.get("/analytics/supplier-performance")
async def get_supplier_performance(current_user: User = Depends(check_permission(Permission.VIEW_ANALYTICS.value))):
    # Supplier reliability based on variance analysis
    supplier_performance = await db.actual_loadings.aggregate([
        {
            "$lookup": {
                "from": "import_orders",
                "localField": "import_order_id",
                "foreignField": "id",
                "as": "order_info"
            }
        },
        {
            "$unwind": "$order_info"
        },
        {
            "$group": {
                "_id": "$order_info.supplier_id",
                "total_orders": {"$sum": 1},
                "avg_qty_variance": {"$avg": "$total_variance_quantity"},
                "avg_weight_variance": {"$avg": "$total_variance_weight"},
                "avg_value_variance": {"$avg": "$total_variance_value"},
                "reliability_score": {
                    "$avg": {
                        "$cond": [
                            {"$lte": [{"$abs": "$total_variance_quantity"}, 5]},
                            100,
                            {"$subtract": [100, {"$multiply": [{"$abs": "$total_variance_quantity"}, 2]}]}
                        ]
                    }
                }
            }
        },
        {"$sort": {"reliability_score": -1}}
    ]).to_list(100)
    
    return {"supplier_performance": supplier_performance}

@api_router.get("/analytics/container-optimization")
async def get_container_optimization(current_user: User = Depends(check_permission(Permission.VIEW_ANALYTICS.value))):
    # Container utilization analysis
    optimization_data = await db.import_orders.aggregate([
        {
            "$group": {
                "_id": "$container_type",
                "total_orders": {"$sum": 1},
                "avg_utilization": {"$avg": "$utilization_percentage"},
                "min_utilization": {"$min": "$utilization_percentage"},
                "max_utilization": {"$max": "$utilization_percentage"},
                "underutilized_count": {
                    "$sum": {"$cond": [{"$lt": ["$utilization_percentage", 70]}, 1, 0]}
                },
                "total_savings_potential": {
                    "$sum": {
                        "$cond": [
                            {"$lt": ["$utilization_percentage", 70]},
                            {"$multiply": ["$freight_charges", 0.3]},  # 30% savings potential
                            0
                        ]
                    }
                }
            }
        }
    ]).to_list(100)
    
    # Monthly utilization trends
    monthly_trends = await db.import_orders.aggregate([
        {
            "$group": {
                "_id": {
                    "year": {"$year": {"$dateFromString": {"dateString": "$created_at"}}},
                    "month": {"$month": {"$dateFromString": {"dateString": "$created_at"}}},
                    "container_type": "$container_type"
                },
                "avg_utilization": {"$avg": "$utilization_percentage"},
                "order_count": {"$sum": 1}
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]).to_list(100)
    
    return {
        "optimization_data": optimization_data,
        "monthly_trends": monthly_trends
    }