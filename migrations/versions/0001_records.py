"""Initial fixture baseline, not a migration of any legacy production database."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0001"
down_revision = None


def upgrade():
    op.create_table(
        "records",
        sa.Column("kind", sa.Text, primary_key=True),
        sa.Column("record_id", sa.Text, primary_key=True),
        sa.Column("logical_id", sa.Text, nullable=False),
        sa.Column("payload", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "kind IN ('source','design','site','placement','run','candidate',"
            "'rule','draft','evaluation')",
            name="records_kind",
        ),
        sa.CheckConstraint("jsonb_typeof(payload) = 'object'", name="records_object"),
    )
    op.create_index("records_logical_identity", "records", ["kind", "logical_id"])
    op.create_table(
        "record_references",
        sa.Column("owner_kind", sa.Text, primary_key=True),
        sa.Column("owner_id", sa.Text, primary_key=True),
        sa.Column("target_kind", sa.Text, primary_key=True),
        sa.Column("target_id", sa.Text, primary_key=True),
        sa.ForeignKeyConstraint(["owner_kind", "owner_id"], ["records.kind", "records.record_id"]),
        sa.ForeignKeyConstraint(
            ["target_kind", "target_id"], ["records.kind", "records.record_id"]
        ),
    )
    op.execute("""
        CREATE FUNCTION reject_record_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Persistence records and references are append-only'; END;
        $$
    """)
    for table in ("records", "record_references"):
        op.execute(
            f"CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION reject_record_mutation()"
        )
        op.execute(
            f"CREATE TRIGGER immutable_table BEFORE TRUNCATE ON {table} "
            "FOR EACH STATEMENT EXECUTE FUNCTION reject_record_mutation()"
        )


def downgrade():
    raise RuntimeError("Destructive downgrade unsupported; restore a backup to a new database")
