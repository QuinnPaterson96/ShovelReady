"""Admit self-contained draft diagnostics without rewriting existing records."""

from alembic import op

revision = "0004"
down_revision = "0003"


def upgrade():
    op.drop_constraint("records_kind", "records", type_="check")
    op.create_check_constraint(
        "records_kind",
        "records",
        "kind IN ('source','design','site','placement','run','candidate',"
        "'rule','draft','evaluation','review','spatial','draft_evaluation')",
    )


def downgrade():
    raise RuntimeError("Destructive downgrade unsupported; restore a backup to a new database")
