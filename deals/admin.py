from django.contrib import admin

from .models import Deal, DealSignal, PipelineStage

admin.site.register(Deal)
admin.site.register(PipelineStage)
admin.site.register(DealSignal)
