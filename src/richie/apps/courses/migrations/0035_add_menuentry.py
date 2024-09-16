# Generated by Django 4.2.16 on 2024-09-19 00:24

import django.db.models.deletion
from django.db import migrations, models

from ..defaults import MENU_ENTRY_COLOR_CLASSES


class Migration(migrations.Migration):

    dependencies = [
        ("cms", "0022_auto_20180620_1551"),
        ("courses", "0034_auto_20230817_1736"),
    ]

    operations = [
        migrations.CreateModel(
            name="MainMenuEntry",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "allow_submenu",
                    models.BooleanField(
                        default=False,
                        help_text="If enabled the page entry in menu will be a dropdown for its possible children.",
                        verbose_name="Allow submenu",
                    ),
                ),
                (
                    "menu_color",
                    models.CharField(
                        blank=True,
                        choices=MENU_ENTRY_COLOR_CLASSES,
                        default="",
                        help_text="A color used to display page entry in menu.",
                        max_length=10,
                        verbose_name="Color in menu",
                    ),
                ),
                (
                    "extended_object",
                    models.OneToOneField(
                        editable=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="cms.page",
                    ),
                ),
                (
                    "public_extension",
                    models.OneToOneField(
                        editable=False,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="draft_extension",
                        to="courses.mainmenuentry",
                    ),
                ),
            ],
            options={
                "verbose_name": "main menu entry",
                "verbose_name_plural": "main menu entries",
                "db_table": "richie_menuentry",
                "ordering": ["-pk"],
            },
        ),
    ]
