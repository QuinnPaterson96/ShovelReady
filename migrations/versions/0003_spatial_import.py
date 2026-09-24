"""Admit sr-09.v1 spatial observations; existing payloads and triggers are unchanged."""

from alembic import op

revision = "0003"
down_revision = "0002"


def upgrade():
    op.drop_constraint("records_kind", "records", type_="check")
    op.create_check_constraint(
        "records_kind",
        "records",
        "kind IN ('source','design','site','placement','run','candidate',"
        "'rule','draft','evaluation','review','spatial')",
    )


def downgrade():
    raise RuntimeError("Destructive downgrade unsupported; restore a backup to a new database")
