from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clients", "0005_client_profile_refinement"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="product_type",
            field=models.CharField(
                choices=[("physical", "Physical product"), ("service", "Service")],
                default="physical",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="tags",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="clientproductlink",
            name="relationship",
            field=models.CharField(
                choices=[
                    ("preferred", "Preferred"),
                    ("frequent", "Frequently purchased"),
                    ("recent", "Recent purchase"),
                    ("interested", "Interested in"),
                    ("stopped", "Stopped ordering"),
                ],
                default="preferred",
                max_length=20,
            ),
        ),
    ]
