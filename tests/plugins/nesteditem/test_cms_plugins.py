"""
NestedItem plugin tests
"""

from django.db import IntegrityError, transaction

from cms.api import add_plugin
from cms.models import Placeholder

from richie.apps.core.tests.utils import CMSPluginTestCase
from richie.plugins.nesteditem.cms_plugins import NestedItemPlugin
from richie.plugins.nesteditem.factories import NestedItemFactory


# pylint: disable=too-many-ancestors
class NestedItemCMSPluginsTestCase(CMSPluginTestCase):
    """NestedItem plugin tests case"""

    @transaction.atomic
    def test_factory_nesteditem_content_required(self):
        """
        The "content" field is required to be not null.
        """
        with self.assertRaises(IntegrityError) as cm:
            NestedItemFactory(content=None)
        self.assertTrue(
            (
                'null value in column "content" of relation "nesteditem_nesteditem"'
                " violates not-null constraint"
            )
            in str(cm.exception)
            or "Column 'content' cannot be null" in str(cm.exception)
        )

    @transaction.atomic
    def test_factory_nesteditem_variant_required(self):
        """
        The "variant" field is required to be not null.
        """
        with self.assertRaises(IntegrityError) as cm:
            NestedItemFactory(variant=None)
        self.assertTrue(
            (
                'null value in column "variant" of relation "nesteditem_nesteditem"'
                " violates not-null constraint"
            )
            in str(cm.exception)
            or "Column 'variant' cannot be null" in str(cm.exception)
        )

    def test_factory_nesteditem_create_success(self):
        """
        NestedItem plugin creation success
        """
        nesteditem = NestedItemFactory(content="Foo")
        self.assertEqual("Foo", nesteditem.content)

    def test_cms_plugins_nesteditem_context_and_html(self):
        """
        Instanciating this plugin with an instance should populate the context
        and render in the template.
        """
        placeholder = Placeholder.objects.create(slot="test")

        # Create random values for parameters with a factory
        nesteditem = NestedItemFactory()

        model_instance = add_plugin(
            placeholder, NestedItemPlugin, "en", content=nesteditem.content
        )
        plugin_instance = model_instance.get_plugin_class_instance()
        plugin_context = plugin_instance.render({}, model_instance, None)

        # Check if "instance" is in plugin context
        self.assertIn("instance", plugin_context)

        # Check if parameters, generated by the factory, are correctly set in
        # "instance" of plugin context
        self.assertEqual(plugin_context["instance"].content, nesteditem.content)

        # Template context
        context = self.get_practical_plugin_context()

        # Get generated html for nesteditem content
        html = context["cms_content_renderer"].render_plugin(model_instance, {})

        # Check rendered content
        self.assertIn(nesteditem.content, html)
