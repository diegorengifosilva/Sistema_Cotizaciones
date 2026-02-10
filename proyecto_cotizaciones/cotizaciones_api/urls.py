# proyecto_cotizaciones/cotizaciones_api/urls.py

from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from cotizaciones_api.views_frontend import FrontendAppView

# Registramos ViewSets en el router
router = DefaultRouter()
# router.register(r'cotizaciones', views.CotizacionViewSet, basename='cotizaciones')
# router.register(r'aprobaciones', views.AprobacionCotizacionViewSet, basename='aprobaciones')

urlpatterns = [
    # CSRF
    path('csrf/', views.get_csrf_token, name='get_csrf_token'),
    
    # LOGIN Y USUARIO
    path('login/', views.login_usuario, name='login_usuario'),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path('usuario-actual/', views.usuario_actual, name='usuario_actual'),
    path('usuarios-activos/', views.usuarios_activos, name='usuarios_activos'),

    # DASHBOARD PRINCIPAL
    path('cotizaciones/aprobacion_cotizacion', views.cotizaciones_dashboard_view, name="cotizaciones_dashboard_view"),
    path('cotizaciones/modal/<str:num_reg>/', views.cotizacion_modal_view, name='cotizacion_modal_view'),
    path("cotizacion/<int:num_reg>/suministros/", views.listar_suministros, name="listar_suministros"),
    path("cotizacion/<int:num_reg>/servicios/", views.listar_servicios, name="listar_servicios"),
    path('cotizacion/<int:num_reg>/mensajes/', views.listar_mensajes, name='listar_mensajes'),
    path("cotizacion/<int:num_reg>/seguimientos/", views.listar_seguimientos, name="listar_seguimiento"),
    path("cotizaciones/<int:num_reg>/totales-descuento/", views.totales_descuento_view, name="totales_descuento"),
    path("cotizaciones/<int:num_reg>/recalcular-totales/", views.recalcular_totales_cotizacion, name="recalcular_totales_cotizacion"),

    # BUSQUEDA
    path('clientes/<str:empresa>/encargados/', views.buscar_encargados_por_empresa, name='buscar_encargados_por_empresa'),

    # ADJUNTOS
    path('cotizaciones/adjuntos/', views.subir_archivo, name='subir_archivo'),
    path("cotizaciones/adjuntos/listar/<str:num_reg>/", views.listar_adjuntos, name="listar_adjuntos"),
    path("cotizaciones/adjuntos/eliminar/", views.eliminar_archivo, name="eliminar_archivo"),

    # GESTION
    path("cotizaciones/<str:num_reg>/condiciones-generales/", views.condiciones_generales, name="condiciones_generales"),
    path("cotizaciones/<str:numero>/generar-codigo/", views.generar_codigo_view, name="generar_codigo"),
    path("cotizaciones/generar_codigo/<str:num_reg>/", views.generar_codigo_cotizacion, name="generar_codigo_cotizacion"),
    path("cotizaciones/<str:num_reg>/nueva-version/", views.crear_nueva_version_cotizacion, name="nueva-version"),
    path("cotizaciones/<str:num_reg>/asignar-regus/", views.asignar_regus, name="asignar_regus"),
    path("cotizaciones/<str:num_reg>/generar-copia/", views.generar_copiar_cotizacion, name="generar_copiar_cotizacion"),
    path("cotizaciones/<int:num_reg>/", views.eliminar_cotizacion, name="eliminar_cotizacion"),
    path("cotizaciones/<int:num_reg>/enviar-aprobacion/", views.enviar_cotizacion_aprobacion, name="enviar_cotizacion_aprobacion"),
    path("cotizaciones/<str:num_reg>/cerrar/", views.cerrar_cotizacion, name="cerrar_cotizacion"),
    path("cotizaciones/<int:num_reg>/cambiar-estado/", views.cambiar_estado_cotizacion, name="cambiar_estado_cotizacion"),
    path("cotizaciones/<int:num_reg>/retornar/", views.retornar_cotizacion, name="retornar_cotizacion"),
    path("cotizaciones/<str:num_reg>/pdf-context/", views.cotizacion_pdf_context, name="cotizacion_pdf_context"),
    path("cotizaciones/<str:num_reg>/pdf-preview/", views.cotizacion_pdf_preview, name="cotizacion_pdf_preview"),
    path("cotizaciones/<str:num_reg>/pdf/", views.cotizacion_pdf, name="cotizacion_pdf",),
    path("cotizaciones/<str:num_reg>/descuento/", views.descuento_cotizacion, name="obtener_descuento_cotizacion"),

    # DB_VC
    path("cotizaciones/areas/", views.lista_areas, name="lista_areas"),
    path("cotizaciones/clientes/", views.lista_clientes, name="lista_clientes"),
    path("cotizaciones/estados/", views.lista_estados, name="lista_estados"),
    path("cotizaciones/proveedores/", views.lista_proveedores, name="lista_proveedores"),
    path("cotizaciones/categorias/", views.lista_categorias, name="lista_categorias"),
    path("cotizaciones/tgasto/", views.lista_tgasto, name="lista_tgasto"),
    path("cotizaciones/tgasto_d/", views.lista_tgasto_d, name="lista_tgasto_d"),
    path("cotizaciones/rittal/", views.lista_rittal, name="lista_rittal"),
    path("cotizaciones/rockwell/", views.lista_rockwell, name="lista_rockwell"),
    path("cotizaciones/ceyesa/", views.lista_ceyesa, name="lista_ceyesa"),
    path("cotizaciones/hoffman/", views.lista_hoffman, name="lista_hoffman"),
    path("cotizaciones/alm-articulos/", views.lista_alm_articulos, name="lista_alm_articulos"),

    # GUARDAR COTIZACIÓN
    path("cotizaciones/guardar/", views.guardar_cotizacion, name="guardar_cotizacion"),

    # REPORTES
    path("cotizaciones/reportes/reporte_cotizaciones_dashboard_html/", views.reporte_cotizaciones_dashboard_html, name="reporte_cotizaciones_dashboard_html"),
    path("cotizaciones/reportes/reporte_servicios_html/<int:num_reg>/", views.reporte_servicios_html, name="reporte_servicios_html"),
    path("cotizaciones/reportes/reporte_suministros_html/<str:num_reg>/", views.reporte_suministros_html, name="reporte_suministros_html"),
    path("cotizaciones/reportes/reporte_suministros_excel/<str:num_reg>/", views.reporte_suministros_excel, name="reporte_suministros_excel"),
    path("cotizaciones/reportes/reporte_detallado_cotizacion/<str:num_reg>/", views.reporte_detallado_cotizacion, name="reporte_detallado_cotizacion"),
    path("cotizaciones/reportes/reporte_detallado_excel/<str:num_reg>/", views.reporte_detallado_excel, name="reporte_detallado_excel"),
    path("cotizaciones/reportes/reporte_resumen_cotizacion/<str:num_reg>/", views.reporte_resumen_cotizacion, name="reporte_resumen_cotizacion"),

    # SEGUIMIENTO DE COTIZACIONES
    # path("dashboard/seguimiento-cotizaciones/", views.lista_seguimiento_cotizaciones, name="lista_seguimiento_cotizaciones"),

    # Todas las rutas de ViewSets bajo /api/
    path('', include(router.urls)),

]

