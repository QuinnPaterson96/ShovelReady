from app.routes.events import router as events_router
from app.routes.promotions import router as promotions_router
from app.routes.cards import router as cards_router
from app.routes.card_collections import router as card_collections_router
from app.routes.reports import router as reports_router
from app.routes.users import router as users_router

routers = [
    events_router,
    promotions_router,
    cards_router,
    card_collections_router,
    reports_router,
    users_router,
]
