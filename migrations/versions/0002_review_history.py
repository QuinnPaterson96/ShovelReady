"""Add append-only review events without changing stored revisions."""

from alembic import op

revision = "0002"
down_revision = "0001"


def upgrade():
    op.drop_constraint("records_kind", "records", type_="check")
    op.create_check_constraint(
        "records_kind",
        "records",
        "kind IN ('source','design','site','placement','run','candidate',"
        "'rule','draft','evaluation','review')",
    )


def downgrade():
    raise RuntimeError("Destructive downgrade unsupported; restore a backup to a new database")
