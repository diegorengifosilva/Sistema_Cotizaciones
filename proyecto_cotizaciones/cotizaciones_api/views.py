
# ─── Librerías estándar ─────────────────────────────
import os
import io
import re
import json
import unicodedata
import pandas as pd
import platform
import subprocess
import logging
from decimal import Decimal, InvalidOperation
from html import unescape
from openpyxl import Workbook

# ─── Librerías de terceros ──────────────────────────
from reportlab.pdfgen import canvas

from . import serializers
logger = logging.getLogger(__name__)

# ─── Django core ────────────────────────────────────
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils import timezone
from django.db.models import Sum, Count, Q, F, Max, DecimalField, ExpressionWrapper
from django.db.models.functions import TruncDate, Coalesce
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.db import transaction
from django.views.decorators.http import require_GET
from django.utils.dateparse import parse_date
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

from rest_framework_simplejwt.authentication import JWTAuthentication

# ─── Django REST Framework ──────────────────────────
from rest_framework.decorators import api_view, parser_classes, permission_classes, action, authentication_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status, viewsets, generics, filters, permissions
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.generics import RetrieveAPIView

from django.http import HttpResponse
from django.template.loader import render_to_string
from django.conf import settings
import os

from django.shortcuts import render
from collections import OrderedDict
from string import ascii_uppercase
from copy import deepcopy

CACHE_LIST_KEY = "liquidacion_list"
CACHE_DETAIL_PREFIX = "liquidacion_detail_"

# ─── Modelos y Serializers propios ─────────────────
from django.conf import settings
from datetime import date, datetime, timedelta
from django.utils.timezone import now
from .models import (
    DashboardCotizacion,
    vc_tab_areas,
    vc_tab_clientes,
    vc_tab_estado,
    vc_mov_cotizaciones,
    seg_usuario,
    cont_cias,
    vc_tab_clientes_d,
    CotiSuministros,
    CotiServicios,
    CotiMensajes,
    CotiSeguimiento,
    vc_tab_tproveedor,
    vc_tab_categorias,
    vc_tab_tgastos,
    vc_tab_tgastos_d,
    vc_tab_rittal,
    vc_tab_rockwell,
    vc_tab_ceyesa,
    vc_tab_hoffman,
    alm_articulos,
    )
from .serializers import (
    DashboardCotizacionTablaSerializer,
    AreasSerializer,
    ClientesSerializer,
    EstadoSerializer,
    CotizacionesSerializer,
    SegUsuarioSerializer,
    ContCiasSerializer,
    DashboardCotizacionModalSerializer,
    CotiSuministrosSerializer,
    CotiServiciosSerializer,
    CotiMensajesSerializer,
    CotiSeguimientoSerializer,
    DashboardCotizacionSerializer,
    ProveedoresSerializer,
    CategoriasSerializer,
    TGastosSerializer,
    TGastosDSerializer,
    RittalSerializer,
    RockwellSerializer,
    CeyesaSerializer,
    HoffmanSerializer,
    AlmArticulosSerializer,
)

PLANTILLAS_DIR = os.path.join(os.path.dirname(__file__), "plantillas")

def siguiente_version(cotin):
    import re
    match = re.search(r'([A-Z])', cotin)
    if not match:
        raise ValueError("No se encontró versión en el cotin")

    letra_actual = match.group(1)
    nueva_letra = chr(ord(letra_actual) + 1)

    return cotin.replace(letra_actual, nueva_letra, 1)

# ===== Obtener y asegurar token CSRF =====
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Establece una cookie CSRF en el cliente. 
    Útil para peticiones POST protegidas desde el frontend.
    """
    return JsonResponse({'message': 'CSRF token set correctly.'}, status=200)

#========================================================================================

#=========#
# USUARIO #
#=========#
from cotizaciones_api.models import SegUsuario
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password
from cotizaciones_api.serializers import SegUsuarioSerializer
from rest_framework_simplejwt.authentication import JWTAuthentication

# Login DB_VC
@csrf_exempt
@api_view(['POST'])
def login_usuario(request):
    """
    Login seguro usando la tabla seg_usuarios (base empresarial).
    Usa usuario_usu como identificador único (user_id) en el JWT.
    Compatible con contraseñas planas o hasheadas.
    Devuelve JWT y datos del usuario.
    """
    usuario_input = request.data.get("usuario_usu")
    password_input = request.data.get("password_usu")

    # Validación básica
    if not usuario_input or not password_input:
        return Response(
            {"error": "Debe enviar usuario y contraseña."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Buscar usuario en base principal
        usuario = SegUsuario.objects.using("default").get(usuario_usu=usuario_input.strip())
    except SegUsuario.DoesNotExist:
        return Response(
            {"error": "Usuario no encontrado."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Validar contraseña (plana o hasheada)
    password_db = (usuario.password_usu or "").strip()
    if not (password_db == password_input or check_password(password_input, password_db)):
        return Response(
            {"error": "Contraseña incorrecta."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # ==========================
    #  GENERAR TOKEN PERSONALIZADO
    # ==========================
    refresh = RefreshToken()
    access = refresh.access_token

    # Usar usuario_usu como identificador único
    refresh["user_id"] = usuario.usuario_usu
    access["user_id"] = usuario.usuario_usu
    refresh["username"] = usuario.usuario_usu
    access["username"] = usuario.usuario_usu

    # (Opcional) incluir nombre corto o cargo para validaciones rápidas en frontend
    refresh["nombre"] = usuario.nomb_cort_usu
    access["nombre"] = usuario.nomb_cort_usu

    # Serializar datos del usuario
    user_data = SegUsuarioSerializer(usuario).data

    # Respuesta final
    return Response({
        "access": str(access),
        "refresh": str(refresh),
        "user": user_data
    }, status=status.HTTP_200_OK)

# Datos Usuario
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuario_actual(request):
    """
    Devuelve la información del usuario autenticado usando el JWT.
    Obtiene el usuario desde el claim user_id del token.
    """
    # Decodificar el token manualmente
    jwt_auth = JWTAuthentication()
    header = jwt_auth.get_header(request)
    if header is None:
        return Response({"error": "Token no proporcionado."}, status=status.HTTP_401_UNAUTHORIZED)

    raw_token = jwt_auth.get_raw_token(header)
    validated_token = jwt_auth.get_validated_token(raw_token)

    # Extraer user_id (que es usuario_usu)
    usuario_usu = validated_token.get("user_id")

    if not usuario_usu:
        return Response(
            {"error": "No se pudo obtener el usuario desde el token."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        usuario = seg_usuario.objects.using("default").get(usuario_usu=usuario_usu)
    except seg_usuario.DoesNotExist:
        return Response(
            {"error": "Usuario no encontrado en la base de datos."},
            status=status.HTTP_404_NOT_FOUND
        )

    user_data = SegUsuarioSerializer(usuario).data
    return Response(user_data, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usuarios_activos(request):
    """
    Devuelve usuarios activos (activo = 1)
    Permite búsqueda por:
    - DNI
    - Email
    - Nombre corto
    - Usuario
    """
    q = request.GET.get("q", "").strip()

    usuarios = seg_usuario.objects.using("default").filter(activo=1)

    if q:
        usuarios = usuarios.filter(
            Q(dni__icontains=q) |
            Q(email_usu__icontains=q) |
            Q(nomb_cort_usu__icontains=q) |
            Q(usuario_usu__icontains=q)
        )

    serializer = SegUsuarioSerializer(usuarios, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

#========================================================================================

#=========================#
# APROBACION COTIZACIONES #
#=========================#
# ─── Dashboard Cotizaciones (versión moderna) ─────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cotizaciones_dashboard_view(request):
    """
    Dashboard + Tabla para cotizaciones con filtros flexibles.
    Estilo moderno equivalente al dashboard de CAJA CHICA.
    """
    try:
        from datetime import date
        from unidecode import unidecode
        from django.db.models import Func, F, Value, TextField
        from django.db.models.functions import Lower
        import re

        # ============================================================
        # 1) Parámetros principales
        # ============================================================
        anno = request.GET.get("anno", date.today().year)
        mes = request.GET.get("mes", "%")

        cliente = request.GET.get("cliente", "%")
        estado = request.GET.get("estado", "%")
        area = request.GET.get("area", "%")
        envio = request.GET.get("envio", "%")

        CAMPOS_BUSQUEDA = {
            "num_reg": "num_reg",
            "cotin": "numero",
            "cotif": "fecha",
            "cliente_nombre": "cliente_nombre",
            "refef": "referencia",
            "nombr": "nombr",
            "nombc": "nombc",
            "nombt": "nombt",
            "tot_c": "tot_c",
            "tot_d": "tot_d",
            "prob": "prob",
            "regus": "regus",
        }

        # Búsqueda flexible
        campo = request.GET.get("campo")
        valor = request.GET.get("valor")

        fecha_inicio = request.GET.get("fechaInicio")
        fecha_fin = request.GET.get("fechaFin")

        # ============================================================
        # 2) Query base
        # ============================================================
        qs = DashboardCotizacion.objects.filter(
            fecha__year=anno
        )

        if mes != "%":
            qs = qs.filter(fecha__month=mes)

        if cliente != "%":
            qs = qs.filter(cliente_codigo=cliente)

        if estado != "%":
            estados = [e for e in estado.split(",") if e]

            if len(estados) == 1:
                qs = qs.filter(estado_codigo=estados[0])
            else:
                qs = qs.filter(estado_codigo__in=estados)

        if area != "%":
            qs = qs.filter(area_codigo=area)

        if envio != "%":
            qs = qs.filter(envio=envio)

        # Rango de fechas
        if fecha_inicio:
            qs = qs.filter(fecha__gte=fecha_inicio)
        if fecha_fin:
            qs = qs.filter(fecha__lte=fecha_fin)

        # ============================================================
        # 3) Normalización de búsqueda flexible
        # ============================================================
        def normalizar(texto):
            if not texto:
                return None
            t = unidecode(texto.lower().strip())
            return re.sub(r"\s+", " ", t)

        class Replace(Func):
            function = "REPLACE"
            arity = 3

        if campo and valor not in (None, "", " "):
            campo_real = CAMPOS_BUSQUEDA.get(campo)

            if campo_real:
                valor_norm = normalizar(valor)

                qs = qs.annotate(
                    campo_clean=Replace(
                        Replace(
                            Lower(F(campo_real)),
                            Value("  ", output_field=TextField()),
                            Value(" ", output_field=TextField()),
                            output_field=TextField()
                        ),
                        Value("  ", output_field=TextField()),
                        Value(" ", output_field=TextField()),
                        output_field=TextField()
                    )
                ).filter(campo_clean__icontains=valor_norm)

        # ============================================================
        # 4) Dashboard Stats mejorado
        # ============================================================
        total = qs.count()

        estados_db = vc_tab_estado.objects.filter(activo=True).values_list("nombre", flat=True)
        estado_map = {e: 0 for e in estados_db}

        meses = [0] * 12
        monto_total_soles = 0
        monto_total_dolares = 0
        este_mes = 0

        hoy = date.today()

        # Diccionario para stats por cliente
        clientes_stats = {}

        for c in qs:
            # ===== Estados =====
            estado_nombre = c.estado_nombre or "Pendiente"
            estado_map[estado_nombre] = estado_map.get(estado_nombre, 0) + 1

            # ===== Monto por moneda =====
            if hasattr(c, "tmone"):
                if c.tmone == "S":
                    monto_total_soles += float(c.tot_c or 0)
                elif c.tmone == "D":
                    monto_total_dolares += float(c.tot_c or 0)
            else:
                # si no hay tmone definido, asumimos S/ por defecto
                monto_total_soles += float(c.tot_c or 0)

            # ===== Conteo por mes =====
            if c.fecha:
                idx = c.fecha.month - 1
                meses[idx] += 1
                if c.fecha.month == hoy.month:
                    este_mes += 1

            # ===== Stats por cliente =====
            codigo = c.cliente_codigo  # código del cliente
            nombre = c.cliente_nombre or "-"
            
            if codigo not in clientes_stats:
                clientes_stats[codigo] = {
                    "cliente_codigo": codigo,
                    "nombre": nombre,
                    "cantidad": 0,
                    "totalSoles": 0,
                    "totalDolares": 0,
                }

            clientes_stats[codigo]["cantidad"] += 1
            if hasattr(c, "tmone"):
                if c.tmone == "S":
                    clientes_stats[codigo]["totalSoles"] += float(c.tot_c or 0)
                elif c.tmone == "D":
                    clientes_stats[codigo]["totalDolares"] += float(c.tot_c or 0)
            else:
                clientes_stats[codigo]["totalSoles"] += float(c.tot_c or 0)

        # Calcular porcentaje de uso por cliente
        for cliente in clientes_stats.values():
            cliente["porcentaje"] = round((cliente["cantidad"] / total) * 100, 2) if total else 0

        # Convertir a lista para enviar al frontend
        clientes_list = list(clientes_stats.values())

        # ===== Dashboard final =====
        dashboard_data = {
            "total": total,
            "esteMes": este_mes,
            "montoTotalSoles": round(monto_total_soles, 2),
            "montoTotalDolares": round(monto_total_dolares, 2),
            "promedioSoles": round(monto_total_soles / total, 2) if total else 0,
            "promedioDolares": round(monto_total_dolares / total, 2) if total else 0,
            "estados": estado_map,
            "porMes": meses,
            "clientes": clientes_list,  # ✅ aquí agregamos los stats de clientes
        }

        # ============================================================
        # 5) Tabla de registros
        # ============================================================
        tabla_data = DashboardCotizacionTablaSerializer(
            qs.order_by(
                F("envio").asc(nulls_last=True),
                F("fecha").desc(),
                F("num_reg").desc(),
            ),
            many=True
        ).data

        # ============================================================
        # 6) Respuesta final
        # ============================================================
        return Response({
            "dashboard": dashboard_data,
            "tabla": tabla_data,
            "anno": anno
        })

    except Exception:
        import traceback
        print(traceback.format_exc())
        return Response({"error": "Error interno en el servidor."}, status=500)

# Detalle de cotización por num_reg
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cotizacion_modal_view(request, num_reg):
    """
    Retorna los detalles completos de una cotización usando num_reg 
    (clave principal real del registro).
    """
    try:
        # Buscar la cotización por num_reg
        cot = DashboardCotizacion.objects.filter(num_reg=num_reg).first()
        if not cot:
            return Response(
                {"error": f"No se encontró la cotización con num_reg {num_reg}"},
                status=404
            )

        # Serializar
        serializer = DashboardCotizacionModalSerializer(cot)
        return Response(serializer.data)

    except Exception as e:
        import traceback
        print("Error en cotizacion_modal_view:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)

@api_view(["GET", "POST", "PUT"])
@permission_classes([IsAuthenticated])
def listar_suministros(request, num_reg):
    try:
        # ======================
        # 📄 LISTAR
        # ======================
        if request.method == "GET":
            suministros = CotiSuministros.objects.filter(
                num_reg=num_reg
            ).order_by("num")

            serializer = CotiSuministrosSerializer(suministros, many=True)
            return Response(serializer.data)

        # ======================
        # ➕ CREAR
        # ======================
        if request.method == "POST":
            data = request.data.copy()
            data["num_reg"] = num_reg

            serializer = CotiSuministrosSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=201)

            return Response(serializer.errors, status=400)

        # ======================
        # ✏️ ACTUALIZAR
        # ======================
        if request.method == "PUT":
            item_id = request.data.get("id")

            try:
                item_id = int(item_id)
            except (TypeError, ValueError):
                return Response({"error": "ID inválido"}, status=400)

            suministro = CotiSuministros.objects.get(
                id=item_id,
                num_reg=num_reg
            )

            data = request.data.copy()
            data.pop("id", None)
            data.pop("num_reg", None)

            serializer = CotiSuministrosSerializer(
                suministro,
                data=data,
                partial=True
            )

            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)

            return Response(serializer.errors, status=400)

    except CotiSuministros.DoesNotExist:
        return Response({"error": "Suministro no encontrado"}, status=404)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

def clean_text(text):
    """Limpia espacios, tabulaciones, saltos de línea y decodifica HTML."""
    if not text:
        return ""
    # Decodifica entidades HTML
    text = unescape(text)
    # Reemplaza cualquier secuencia de espacios o saltos de línea por un solo espacio
    text = re.sub(r"\s+", " ", text)
    return text.strip()

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_servicios(request, num_reg):
    try:
        # 1) OBTENER TODOS LOS SERVICIOS (nig = 0)
        servicios_qs = CotiServicios.objects.filter(
            num_reg=num_reg,
            nig=0
        ).order_by("num")

        resultado = []

        tipo_map = {
            "4": "MANO DE OBRA",
            "5": "GASTOS DE SERVICIOS",
            "6": "OTROS",
        }

        for servicio in servicios_qs:
            servicio_data = CotiServiciosSerializer(servicio).data
            titulo_general = clean_text(servicio_data.get("nog"))

            pref_servicio = servicio.cog[:2]

            # 2) FILAS DEL SERVICIO (subgrupos + items)
            rows = CotiServicios.objects.filter(
                num_reg=num_reg,
                cog__startswith=pref_servicio,
                nig__gt=0
            ).order_by("num")

            subgrupos = []

            # 3) CREAR SUBGRUPOS (nig = 1)
            for row in rows.filter(nig=1):
                tipo_digito = row.cog[3]  # 4,5,6
                subgrupo = {
                    "titulo": clean_text(row.nog),       # 🔹 título real de DB
                    "tipoCodigo": f"0{tipo_digito}",     # "04", "05", "06"
                    "tipoNombre": tipo_map.get(tipo_digito, "DESCONOCIDO"),
                    "items": []
                }
                subgrupos.append(subgrupo)

            # 4) ASIGNAR ITEMS (nig = 2)
            for row in rows.filter(nig=2):
                # Buscar el subgrupo correspondiente según los primeros 4 dígitos del cog
                prefijo = row.cog[:4]
                for sg in subgrupos:
                    if sg["tipoCodigo"] == f"0{row.cog[3]}":
                        item = CotiServiciosSerializer(row).data
                        for f in ["des", "cod", "nog", "pro"]:
                            item[f] = clean_text(item.get(f))
                        sg["items"].append(item)
                        break

            resultado.append({
                "tituloGeneral": titulo_general,
                "cantidad": str(servicio.can or "1"),   # 🔹 can (nig = 0)
                "detalle": servicio.tog or "",           # 🔹 tog (HTML)
                "subgrupos": subgrupos
            })

        return Response(resultado)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_mensajes(request, num_reg):
    """
    Lista todos los mensajes asociados a un num_reg.
    """
    try:
        mensajes = CotiMensajes.objects.filter(
            num_reg=num_reg,
            act="1"  # Solo activos
        ).order_by("dat")  # Orden cronológico, más antiguos primero

        serializer = CotiMensajesSerializer(mensajes, many=True)
        return Response(serializer.data)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_seguimientos(request, num_reg):
    """
    Lista todos los seguimientos asociados a un num_reg.
    """
    try:
        seguimientos = CotiSeguimiento.objects.filter(
            num_reg=num_reg,
            act="1"  # Solo activos
        ).order_by("dat")  # Orden cronológico, más antiguos primero

        serializer = CotiSeguimientoSerializer(seguimientos, many=True)
        return Response(serializer.data)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def totales_descuento_view(request, num_reg):
    cot = DashboardCotizacion.objects.get(num_reg=num_reg)

    total = cot.tot_c or 0
    descuento_monto = cot.des_m or 0  # <-- descuento guardado

    total_suministros = (
        CotiSuministros.objects
        .filter(num_reg=num_reg, nig=0)
        .aggregate(
            total=Sum(F("tot") * F("can"))
        )["total"] or 0
    )

    total_servicios = (
        CotiServicios.objects
        .filter(num_reg=num_reg, nig=0)
        .aggregate(
            total=Sum(F("tot") * F("can"))
        )["total"] or 0
    )

    return Response({
        "total": total,
        "suministros": total_suministros,
        "servicios": total_servicios,
        "tot_c": total,             # total base
        "des_m": descuento_monto,   # descuento guardado
    })

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def recalcular_totales_cotizacion(request, num_reg):
    """
    Recalcula el total de la cotización basado en suministros y servicios.
    Retorna el total actualizado.
    """
    try:
        cotizacion = DashboardCotizacion.objects.get(num_reg=num_reg)

        # Totales suministros
        total_suministros = (
            CotiSuministros.objects
            .filter(num_reg=num_reg, nig=0)
            .aggregate(total=Sum(F("tot") * F("can")))["total"] or 0
        )

        # Totales servicios
        total_servicios = (
            CotiServicios.objects
            .filter(num_reg=num_reg, nig=0)
            .aggregate(total=Sum(F("tot") * F("can")))["total"] or 0
        )

        total_general = total_suministros + total_servicios

        # Guardar total
        cotizacion.tot_c = total_general
        cotizacion.save(update_fields=["tot_c"])

        return Response({
            "tot_c": total_general,
            "suministros": total_suministros,
            "servicios": total_servicios,
        })

    except DashboardCotizacion.DoesNotExist:
        return Response({"error": "Cotización no encontrada"}, status=404)

#========================================================================================

##=========##
## GUARDAR ##
##=========##
@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def guardar_cotizacion(request):
    with transaction.atomic():

        num_reg = request.data.get("num_reg")

        # =========================
        # 1️⃣ CREAR O ACTUALIZAR
        # =========================
        if num_reg:
            cotizacion = DashboardCotizacion.objects.select_for_update().get(
                num_reg=num_reg
            )
        else:
            cotizacion = DashboardCotizacion.objects.create(
                num_reg=obtener_siguiente_num_reg(),
                fecha=request.data.get("fecha", timezone.now().date()),
                envio=0,
                sald=Decimal("0.00"),
                tot_c=Decimal("0.00"),
                igv="N",
            )

        # =========================
        # 2️⃣ DATOS
        # =========================
        data = request.data.copy()

        # 🔒 Si no viene acu_e, NO tocarlo
        if "acu_e" not in data:
            data.pop("acu_e", None)

        serializer = DashboardCotizacionSerializer(
            cotizacion,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        cotizacion.igv = cotizacion.igv or "N"

        # =========================
        # 3️⃣ SNAPSHOT CLIENTE
        # =========================
        if cotizacion.cliente_codigo:
            cliente = vc_tab_clientes_d.objects.filter(
                codigo=cotizacion.cliente_codigo
            ).first()

            if cliente:
                cotizacion.codir = cliente.codigo
                cotizacion.nombr = cliente.representante
                cotizacion.cargr = cliente.cargo
                cotizacion.teler = cliente.telefono
                cotizacion.movir = cliente.movil
                cotizacion.mailr = cliente.email

        if cotizacion.fecha:
            cotizacion.anno = str(cotizacion.fecha.year).zfill(4)
            cotizacion.mes = str(cotizacion.fecha.month).zfill(2)

        usuario = seg_usuario.objects.filter(
            nomb_cort_usu=cotizacion.nombc
        ).first()
        cotizacion.codic = usuario.dni if usuario else None

        cotizacion.save()

        # =========================
        # 4️⃣ SUMINISTROS
        # =========================
        suministros = request.data.get("suministros", {})

        # Limpieza total
        CotiSuministros.objects.filter(
            num_reg=cotizacion.num_reg
        ).delete()

        # 👉 Mapeo TIPO → CÓDIGO
        TIPO_MAP = {
            "01": "01",
            "02": "02",
        }

        num_contador = 1
        grupo_index = 1

        for _, grupo in suministros.items():

            # =====================
            # COG CORRECTO (CC + TT)
            # =====================
            cog = grupo.get("cog") or grupo.get("id")

            # Fallback de seguridad (por si viene vacío)
            if not cog:
                tipo = grupo.get("tipo", "01")
                tipo_code = TIPO_MAP.get(tipo, "01")
                cog = f"{grupo_index:02d}{tipo_code}"
                grupo_index += 1

            cantidad_grupo = Decimal(str(grupo.get("cantidad", 0)))
            total_grupo = Decimal(str(grupo.get("total", 0)))

            # =====================
            # CABECERA (nig = 0)
            # =====================
            CotiSuministros.objects.create(
                num_reg=cotizacion.num_reg,
                cog=cog,
                nog=grupo.get("titulo"),
                nig=0,
                num=num_contador,
                cod="0",
                des="",
                pro="",
                can=cantidad_grupo,
                puc=Decimal("0.00"),
                toc=Decimal("0.00"),
                cau=Decimal("0.00"),
                tou=Decimal("0.00"),
                val=Decimal("0.00"),
                tot=total_grupo,
                mov="01",
                tpr="",
                tde="",
                tog="0",
            )

            num_contador += 1

            # =====================
            # ITEMS (nig = 1)
            # =====================
            for item in grupo.get("items", []):

                CotiSuministros.objects.create(
                    num_reg=cotizacion.num_reg,
                    cog=cog,
                    nog="",
                    nig=1,
                    num=num_contador,
                    cod=item.get("cod"),
                    des=item.get("des"),
                    pro=item.get("pro"),
                    can=Decimal(str(item.get("can", 0))),
                    puc=Decimal(str(item.get("puc", 0))),
                    toc=Decimal(str(item.get("toc", 0))),
                    cau=Decimal(str(item.get("cau", 0))),
                    tou=Decimal(str(item.get("tou", 0))),
                    val=Decimal(str(item.get("val", 0))),
                    tot=Decimal(str(item.get("tot", 0))),
                    mov="01",
                    tpr=item.get("tpr"),
                    tde=item.get("tde"),
                    tog="0",
                )

                num_contador += 1

        # =========================
        # 5️⃣ SERVICIOS
        # =========================
        servicios = request.data.get("servicios", {})

        if isinstance(servicios, list):
            servicios = {str(i): s for i, s in enumerate(servicios)}

        # Limpieza total (igual que suministros)
        CotiServicios.objects.filter(
            num_reg=cotizacion.num_reg
        ).delete()

        SUB_MAP = {
            "MANO DE OBRA": "04",
            "GASTOS DE SERVICIO": "05",
            "OTROS": "06",
        }

        for _, servicio in servicios.items():

            # =====================
            # CABECERA SERVICIO (nig = 0)
            # =====================
            cog_servicio = f"{grupo_index:02d}000"
            total_servicio = Decimal("0.00")
            cantidad_servicio = Decimal(str(servicio.get("cantidad", 1)))

            CotiServicios.objects.create(
                num_reg=cotizacion.num_reg,
                cog=cog_servicio,
                nog=servicio.get("tituloGeneral") or servicio.get("nombre", ""),
                nig=0,
                num=num_contador,
                cod="0",
                can=cantidad_servicio,
                tot=Decimal("0.00"),
                tog=servicio.get("detalle", ""),  # 🔴 AQUÍ
            )

            num_servicio = num_contador
            num_contador += 1

            # =====================
            # SUBGRUPOS (nig = 1)
            # =====================
            for sub in servicio.get("subgrupos", []):
                tipo = sub.get("titulo", "OTROS")
                tipo_code = sub.get("tipoCodigo", "06")  # 🔹 usamos el tipo que envía frontend
                total_sub = Decimal("0.00")

                cog_sub = f"{grupo_index:02d}{tipo_code}1"

                CotiServicios.objects.create(
                    num_reg=cotizacion.num_reg,
                    cog=cog_sub,
                    nog=tipo,
                    nig=1,
                    num=num_contador,
                    cod="0",
                    can=Decimal("0.00"),
                    tot=Decimal("0.00"),
                    mov=sub.get("mov", ""),
                )

                num_sub = num_contador
                num_contador += 1

                # =====================
                # ITEMS (nig = 2)
                # =====================
                for item in sub.get("items", []):
                    total_item = Decimal(str(item.get("tot", 0)))
                    cog_item = f"{grupo_index:02d}{tipo_code}2"

                    CotiServicios.objects.create(
                        num_reg=cotizacion.num_reg,
                        cog=cog_item,
                        nog="",
                        nig=2,
                        num=num_contador,
                        cod=(
                            f"{item.get('personalCodigo','')} - {item.get('personal','')}"
                            if tipo == "MANO DE OBRA"
                            else item.get("cod", "")
                        ),
                        des=item.get("des", ""),
                        pro=item.get("pro", 8),
                        can=Decimal(str(item.get("can", 1))),
                        puc=Decimal(str(item.get("puc", 0))),
                        toc=Decimal(str(item.get("toc", 0))),
                        cau=Decimal(str(item.get("cau", 0))),
                        tou=Decimal(str(item.get("tou", 0))),
                        val=Decimal(str(item.get("val", 0))),
                        tot=total_item,
                        mov=item.get("mov", ""),
                        tpr=item.get("tpr", ""),
                        tde=item.get("tde", 1),
                    )

                    total_sub += total_item
                    total_servicio += total_item
                    num_contador += 1

                # actualizar subtotal
                CotiServicios.objects.filter(
                    num_reg=cotizacion.num_reg,
                    num=num_sub,
                    nig=1
                ).update(tot=total_sub)

            # actualizar total servicio
            CotiServicios.objects.filter(
                num_reg=cotizacion.num_reg,
                num=num_servicio,
                nig=0
            ).update(tot=total_servicio)

            grupo_index += 1

        # =========================
        # 6️⃣ MENSAJES
        # =========================
        mensaje_data = request.data.get("mensaje")

        if mensaje_data:
            CotiMensajes.objects.create(
                num_reg=cotizacion.num_reg,
                cod=request.user.usuario_usu if hasattr(request.user, "usuario_usu") else request.user.username,
                msj=mensaje_data.get("msj"),
                act=mensaje_data.get("act", "1"),
            )

        # =========================
        # 7️⃣ SEGUIMIENTOS
        # =========================
        seguimiento_data = request.data.get("seguimiento")  # 🔑 similar a "mensaje"

        if seguimiento_data:
            # Crear nuevo registro en CotiSeguimiento
            CotiSeguimiento.objects.create(
                num_reg=cotizacion.num_reg,
                num=seguimiento_data.get("num", 0),  # opcional, si no lo envías
                dat=timezone.now(),  # se usa la fecha actual como PK virtual
                fec=timezone.now().strftime("%Y-%m-%d %H:%M:%S"),  # tu campo 'fec' string
                hor=timezone.now().strftime("%H:%M:%S"),  # opcional
                des=seguimiento_data.get("des"),
                cod=request.user.usuario_usu if hasattr(request.user, "usuario_usu") else request.user.username,
                act=seguimiento_data.get("act", "1"),
            )

        # =========================
        # 8️⃣ TOTAL GENERAL + DESCUENTO
        # =========================
        descuento = request.data.get("descuento", {})
        aplicar = descuento.get("aplicar", False)
        aplica_a = descuento.get("aplicaA")
        importe_desc = Decimal(str(descuento.get("importe", 0)))
        porcentaje_desc = Decimal(str(descuento.get("porcentaje", 0)))

        # Totales base
        total_suministros = sum(
            Decimal(str(grupo.get("total", 0))) *
            Decimal(str(grupo.get("cantidad", 1)))
            for grupo in suministros.values()
        )

        total_servicios = sum(
            Decimal(str(grupo.get("total", 0)))
            for grupo in servicios.values()
        )

        total_general = total_suministros + total_servicios

        # Aplicar descuento
        if aplicar and importe_desc > 0:
            if aplica_a == "TOTAL":
                total_general -= importe_desc
            elif aplica_a == "SUMINISTROS":
                total_general = (total_suministros - importe_desc) + total_servicios
            elif aplica_a == "SERVICIOS":
                total_general = total_suministros + (total_servicios - importe_desc)

        if total_general < 0:
            total_general = Decimal("0.00")

        # 👉 ASIGNAR TODO
        cotizacion.tot_c = total_general
        cotizacion.des_a = 1 if aplicar else 0

        if aplica_a == "TOTAL":
            cotizacion.des_t = "T"
        elif aplica_a == "SUMINISTROS":
            cotizacion.des_t = "S"
        elif aplica_a == "SERVICIOS":
            cotizacion.des_t = "M"
        else:
            cotizacion.des_t = None

        cotizacion.des_p = porcentaje_desc
        cotizacion.des_m = importe_desc

        # 👉 AHORA SÍ guardar
        cotizacion.save(update_fields=[
            "tot_c",
            "des_a",
            "des_t",
            "des_p",
            "des_m",
        ])

        return Response(
            {
                "message": "Cotización guardada correctamente",
                "num_reg": cotizacion.num_reg
            },
            status=status.HTTP_200_OK if num_reg else status.HTTP_201_CREATED
        )

# ADICIONAL
def obtener_siguiente_num_reg():
    anio = timezone.now().year

    inicio = int(f"{anio}000000")
    fin = int(f"{anio}999999")

    with transaction.atomic():
        ultimo = (
            DashboardCotizacion.objects
            .select_for_update()
            .filter(num_reg__range=(inicio, fin))
            .aggregate(max_reg=Max("num_reg"))
        )["max_reg"]

        if ultimo is not None:
            return ultimo + 1

        # 🚀 Primer registro del año
        return int(f"{anio}000001")

#========================================================================================

##===========##
## BUSQUEDAS ##
##===========##
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def buscar_encargados_por_empresa(request, empresa):
    q = request.GET.get("q", "").strip()

    encargados = vc_tab_clientes_d.objects.filter(
        empresa=empresa,
        activo=True
    ).filter(
        Q(representante__icontains=q) |
        Q(codigo__icontains=q)
    ).values(
        "codigo",
        "representante",
        "cargo",
        "telefono",
        "movil",
        "email",
        "empresa"
    )

    return Response(list(encargados))

#========================================================================================
##==========##
## ADJUNTOS ##
##==========##
@csrf_exempt
def subir_archivo(request):
    if request.method == "POST":
        print("FILES recibidos:", request.FILES)
        archivo = request.FILES.get("archivo")
        nombre_guardar = request.POST.get("nombre")  # <--- esto es lo nuevo

        if archivo:
            ruta = r"C:\Users\VC-23031\PROYECTOS\Adj"
            try:
                # usa el nombre que enviaste desde React
                with open(os.path.join(ruta, nombre_guardar), "wb+") as destino:
                    for chunk in archivo.chunks():
                        destino.write(chunk)
                return JsonResponse({"ok": True, "archivo": nombre_guardar})
            except Exception as e:
                print("Error al escribir archivo:", e)
                return JsonResponse({"ok": False, "error": str(e)})
        else:
            return JsonResponse({"ok": False, "error": "No se recibió archivo"})
    return JsonResponse({"ok": False, "error": "Método no permitido"})

@csrf_exempt
def listar_adjuntos(request, num_reg):
    carpeta = r"C:\Users\VC-23031\PROYECTOS\Adj"
    try:
        archivos = []
        # Itera los archivos de la carpeta
        for nombre in os.listdir(carpeta):
            if nombre.startswith(str(num_reg)):  # solo archivos que empiezan con num_reg
                archivos.append({
                    "nombre": nombre,               # nombre completo guardado en disco
                    "displayName": nombre[len(str(num_reg)) + 1:],  # quitar prefijo para mostrar
                })
        return JsonResponse({"ok": True, "archivos": archivos})
    except Exception as e:
        return JsonResponse({"ok": False, "error": str(e)})

@csrf_exempt
def eliminar_archivo(request):
    if request.method == "POST":
        nombre = request.POST.get("nombre")

        if not nombre:
            return JsonResponse({"ok": False, "error": "Nombre no recibido"})

        ruta = r"C:\Users\VC-23031\PROYECTOS\Adj"
        path = os.path.join(ruta, nombre)

        if not os.path.exists(path):
            return JsonResponse({"ok": False, "error": "Archivo no existe"})

        try:
            os.remove(path)
            return JsonResponse({"ok": True})
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)})

    return JsonResponse({"ok": False, "error": "Método no permitido"})

##=========##
## GESTION ##
##=========##
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def condiciones_generales(request, num_reg):
    """
    GET:  retorna {"numero", "condiciones"}  (acu_e)
    POST: recibe { "condiciones": "texto..." } y actualiza acu_e
    """
    try:
        cot = DashboardCotizacion.objects.filter(num_reg=num_reg).first()
        if not cot:
            return Response({"error": f"No se encontró la cotización #{num_reg}"}, status=404)

        if request.method == "GET":
            return Response({
                "numero": cot.num_reg,
                "condiciones": cot.acu_e or ""
            }, status=200)

        # POST -> actualizar
        contenido = request.data.get("condiciones", "")
        # opcional: limpiar/trimming
        if isinstance(contenido, str):
            contenido = contenido.strip()

        # usar transaction por seguridad
        with transaction.atomic():
            cot.acu_e = contenido
            cot.save(update_fields=["acu_e"])

        return Response({
            "status": "ok",
            "msg": "Condiciones guardadas correctamente.",
            "numero": cot.numero,
            "condiciones": cot.acu_e or ""
        }, status=200)

    except Exception as e:
        import traceback
        print("Error en condiciones_generales:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)

@csrf_exempt
@api_view(["GET", "POST"])
def generar_codigo_cotizacion(request, num_reg):

    try:
        # =========================
        # OBTENER COTIZACIÓN
        # =========================
        cot = DashboardCotizacion.objects.get(num_reg=num_reg)

        # Si ya tiene código, no inventamos nada
        if cot.numero:
            return JsonResponse({
                "success": True,
                "codigo": cot.numero,
                "exists": True
            })

        # =========================
        # AÑO
        # =========================
        year_full = cot.anno              # ej: 2025
        year = year_full[-2:]             # ej: 25

        # =========================
        # ÁREA
        # =========================
        area = str(cot.area_codigo)

        # =========================
        # ÚLTIMA SECUENCIA POR AÑO + ÁREA
        # =========================
        qs = (
            DashboardCotizacion.objects
            .filter(
                anno=year_full,
                area_codigo=area,
                numero__isnull=False,
            )
            .exclude(numero="")
            .values_list("numero", flat=True)
        )

        max_corr = 0
        len_base = len(year) + len(area)  # 2 + 1 = 3

        for num in qs:
            try:
                corr = int(num[len_base:len_base+3])   # los 3 dígitos del correlativo
                max_corr = max(max_corr, corr)
            except Exception:
                continue

        correlativo = max_corr + 1
        correlativo_str = str(correlativo).zfill(3)

        # =========================
        # BASE DEL CÓDIGO
        # =========================
        base_codigo = f"{year}{area}{correlativo_str}"

        # =========================
        # VERSIÓN (A, B, C...)
        # =========================
        existentes = (
            DashboardCotizacion.objects
            .filter(numero__startswith=base_codigo)
            .values_list("numero", flat=True)
        )

        if not existentes:
            version = "A"
        else:
            letras = [c[len(base_codigo)] for c in existentes]
            version = ascii_uppercase[ascii_uppercase.index(max(letras)) + 1]

        # =========================
        # CLIENTE
        # =========================
        cliente = vc_tab_clientes.objects.get(codigo=cot.cliente_codigo)
        iniciales = cliente.iniciales

        # =========================
        # TIPO
        # =========================
        tipo = cot.cotit

        # =========================
        # CÓDIGO FINAL
        # =========================
        codigo_final = f"{base_codigo}{version}-{iniciales}-{tipo}"

        # =========================
        # SOLO GUARDA EN POST
        # =========================
        if request.method == "POST":
            cot.numero = codigo_final
            cot.save(update_fields=["numero"])

        return JsonResponse({
            "success": True,
            "codigo": codigo_final,
            "preview": request.method == "GET"
        })

    except DashboardCotizacion.DoesNotExist:
        return JsonResponse({
            "success": False,
            "error": "Cotización no encontrada"
        }, status=404)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def descuento_cotizacion(request, num_reg):

    num_reg = str(num_reg)

    cot = DashboardCotizacion.objects.filter(num_reg=num_reg).first()

    if not cot:
        return Response({}, status=404)

    # ============================
    # 🔹 GET → OBTENER
    # ============================
    if request.method == "GET":

        afecto_map = {
            "T": "t",
            "S": "su",
            "M": "ser",
        }

        return Response({
            "aplicar": bool(cot.des_a),
            "afecto": afecto_map.get(cot.des_t, "t"),
            "porcentaje": str(cot.des_p or ""),
            "importe": str(cot.des_m or ""),
        })

    # ============================
    # 🔹 POST → GUARDAR + RECALCULAR TOTAL
    # ============================

    data = request.data

    afecto_reverse = {
        "t": "T",
        "su": "S",
        "ser": "M",
    }

    # ----------------------------
    # 📌 Guardar descuento
    # ----------------------------

    aplicar = bool(data.get("aplicar"))

    afecto_front = data.get("afecto", "t")

    cot.des_a = 1 if aplicar else 0
    cot.des_t = afecto_reverse.get(afecto_front, "T")

    cot.des_p = data.get("porcentaje") or None
    cot.des_m = data.get("importe") or None

    # ----------------------------
    # 🔁 RECALCULAR TOTALES
    # ----------------------------

    total_suministros = CotiSuministros.objects.filter(
        num_reg=num_reg,
        nig=0
    ).aggregate(
        total=Coalesce(
            Sum(
                ExpressionWrapper(
                    F("tot") * F("can"),
                    output_field=DecimalField(max_digits=18, decimal_places=2),
                )
            ),
            Decimal("0.00")
        )
    )["total"]

    total_servicios = CotiServicios.objects.filter(
        num_reg=num_reg,
        nig=0
    ).aggregate(
        total=Coalesce(
            Sum("tot"),
            Decimal("0.00")
        )
    )["total"]

    total_general = total_suministros + total_servicios

    # ----------------------------
    # 🔻 Aplicar descuento
    # ----------------------------

    importe_desc = Decimal(str(data.get("importe") or 0))

    if aplicar and importe_desc > 0:

        if afecto_front == "t":
            total_general -= importe_desc

        elif afecto_front == "su":
            total_general = (total_suministros - importe_desc) + total_servicios

        elif afecto_front == "ser":
            total_general = total_suministros + (total_servicios - importe_desc)

    if total_general < 0:
        total_general = Decimal("0.00")

    cot.tot_c = total_general

    # ----------------------------
    # 💾 Guardar todo
    # ----------------------------

    cot.save(update_fields=[
        "tot_c",
        "des_a",
        "des_t",
        "des_p",
        "des_m",
    ])

    return Response({"ok": True})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cotizacion_pdf_context(request, num_reg):
    context = build_cotizacion_pdf_context(num_reg)

    if not context:
        return Response({"error": "Cotización no existe"}, status=404)

    return Response(context)

@csrf_exempt
def cotizacion_pdf_preview(request, num_reg):
    context = build_cotizacion_pdf_context(num_reg)

    if not context:
        return HttpResponse("Cotización no existe", status=404)

    return render(request, "reportes/cotizacion_pdf.html", context)

def build_cotizacion_pdf_context(num_reg):

    # =========================
    # CABECERA (solo campos usados)
    # =========================
    cotizacion = (
        DashboardCotizacion.objects
        .only(
            "numero", "fecha", "referencia", "cliente_codigo",
            "nombr", "cargr", "teler", "movir", "mailr",
            "nombc", "telec", "mov1c", "mov2c", "mov3c", "mailc",
            "nombt", "telet", "mov1t", "mov2t", "mov3t", "mailt",
            "plazo", "tot_d", "por_c", "tot_s", "tcamb",
            "fpago", "lugar",
            "tmone", "igv",
            "valid", "acu_s",
            "tot_c", "acu_e", "des_m"
        )
        .filter(num_reg=num_reg)
        .first()
    )

    if not cotizacion:
        return None

    # =========================
    # DETALLES
    # =========================
    suministros_qs = (
        CotiSuministros.objects
        .filter(num_reg=num_reg)
        .order_by("cog", "nig", "num")
        .iterator()
    )

    servicios_qs = (
        CotiServicios.objects
        .filter(num_reg=num_reg)
        .order_by("cog", "nig", "num")
        .iterator()
    )

    # =========================
    # CABECERA CONTEXT
    # =========================
    cabecera = {
        "numero": cotizacion.numero,
        "fecha": cotizacion.fecha,
        "referencia": cotizacion.referencia,
        "cliente": cotizacion.cliente_codigo,
        "atencion": {
            "nombre": cotizacion.nombr,
            "cargo": cotizacion.cargr,
            "telefono": cotizacion.teler or cotizacion.movir,
            "correo": cotizacion.mailr,
        },
        "comercial": {
            "nombre": cotizacion.nombc,
            "telefono": cotizacion.telec,
            "movil1": cotizacion.mov1c,
            "movil2": cotizacion.mov2c,
            "movil3": cotizacion.mov3c,
            "correo": cotizacion.mailc,
        },
        "tecnico": {
            "nombre": cotizacion.nombt,
            "telefono": cotizacion.telet,
            "movil1": cotizacion.mov1t,
            "movil2": cotizacion.mov2t,
            "movil3": cotizacion.mov3t,
            "correo": cotizacion.mailt,
        },
        "tiempo_entrega": {
            "suministros": {
                "cantidad": cotizacion.plazo,
                "tipo": "Días" if cotizacion.tot_d == "D" else "Semanas" if cotizacion.tot_d == "S" else "Meses",
            },
            "servicios": {
                "cantidad": cotizacion.por_c,
                "tipo": "Días" if cotizacion.tot_s == "D" else "Semanas" if cotizacion.tot_s == "S" else "Meses",
            },
        },
        "forma_pago": cotizacion.fpago,
        "lugar_entrega": cotizacion.lugar,
        "moneda": "Dólares" if cotizacion.tmone == "D" else "Soles",
        "incluye_igv": cotizacion.igv == "S",
        "validez": {
            "cantidad": cotizacion.valid,
            "tipo": "Días" if cotizacion.acu_s == "D" else "Semanas" if cotizacion.acu_s == "S" else "Meses",
        },
    }

    # =========================
    # SUMINISTROS
    # =========================
    grupos = OrderedDict()

    for s in suministros_qs:

        if not s.cog:
            continue

        if s.nig == 0:

            can = s.can or Decimal("1.00")
            tot = s.tot or Decimal("0.00")

            grupos[s.cog] = {
                "cog": s.cog,
                "titulo": s.nog,
                "mov": s.mov,
                "cantidad": can,
                "total": tot,
                "total_grupo": tot * can,
                "subtotal_pu_items": Decimal("0.00"),
                "subtotal_tot_items": Decimal("0.00"),
                "items": [],
            }

        elif s.nig == 1 and s.cog in grupos:

            pu = s.puc or Decimal("0.00")
            tot = s.tot or Decimal("0.00")

            grupos[s.cog]["items"].append({
                "codigo": s.cod,
                "descripcion": s.des,
                "unidad": s.tde,
                "cantidad": s.can or Decimal("0.00"),
                "precio_unitario": pu,
                "total": tot,
            })

            grupos[s.cog]["subtotal_pu_items"] += pu
            grupos[s.cog]["subtotal_tot_items"] += tot

    suministros = list(grupos.values())
    total_suministros = sum(
        (g["total_grupo"] for g in suministros),
        Decimal("0.00"),
    )

    # =========================
    # SERVICIOS
    # =========================
    servicios_grupos = OrderedDict()

    for s in servicios_qs:

        if not s.cog:
            continue

        if s.nig == 0:

            can = s.can or Decimal("1.00")
            tot = s.tot or Decimal("0.00")

            servicios_grupos[s.cog] = {
                "cog": s.cog,
                "titulo": s.nog,
                "mov": s.mov,
                "cantidad": can,
                "total": tot,
                "total_servicio": tot * can,
                "detalle": html_to_text(s.tog) if s.tog else "",
                "subtotal_pu_items": Decimal("0.00"),
                "subtotal_tot_items": Decimal("0.00"),
                "items": [],
            }

        elif s.nig == 1 and s.cog in servicios_grupos:

            pu = s.puc or Decimal("0.00")
            tot = s.tot or Decimal("0.00")

            servicios_grupos[s.cog]["items"].append({
                "codigo": s.cod,
                "descripcion": s.des,
                "proveedor": s.pro,
                "unidad": s.tde,
                "cantidad": s.can or Decimal("0.00"),
                "precio_unitario": pu,
                "total": tot,
            })

            servicios_grupos[s.cog]["subtotal_pu_items"] += pu
            servicios_grupos[s.cog]["subtotal_tot_items"] += tot

    servicios = list(servicios_grupos.values())

    total_servicios = sum(
        (s["total_servicio"] for s in servicios),
        Decimal("0.00"),
    )

    # =========================
    # CONTEXT FINAL
    # =========================
    descuento = cotizacion.des_m or Decimal("0.00")
    total_bruto = cotizacion.tot_c or Decimal("0.00")

    total_final = total_bruto - descuento

    return {
        "cabecera": cabecera,
        "suministros": suministros,
        "servicios": servicios,
        "totales": {
            "suministros": total_suministros,
            "servicios": total_servicios,
            "descuento": descuento,
            "total_cotizacion": total_final,
            "moneda": cabecera["moneda"],
            "incluye_igv": cabecera["incluye_igv"],
        },
        "condiciones_generales": {
            "condiciones": cotizacion.acu_e,
        },
    }

from pathlib import Path
from django.conf import settings
from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML

def cotizacion_pdf(request, num_reg):
    context = build_cotizacion_pdf_context(num_reg)

    if not context:
        return HttpResponse("Cotización no existe", status=404)

    # 📌 Definimos la carpeta base de assets para evitar repetir código
    assets_dir = Path(settings.BASE_DIR) / "frontend" / "src" / "assets"

    # 📌 Rutas de Imágenes Principales
    context["logo_path"] = (assets_dir / "logo.png").as_uri()
    context["header_path"] = (assets_dir / "encabezado-reporte.png").as_uri()

    # 📌 Rutas del Nuevo Pie de Página (Basado en tus archivos)
    context["footer_bg_path"] = (assets_dir / "pie pagina-reporte.png").as_uri()
    context["sgs_path"] = (assets_dir / "sgs.png").as_uri()
    context["homologada_path"] = (assets_dir / "empresa homologada.png").as_uri()
    context["mega_path"] = (assets_dir / "mega.png").as_uri()
    context["correo_path"] = (assets_dir / "correo cormercial.png").as_uri()

    html_string = render_to_string("reportes/cotizacion_pdf.html", context)

    # Generación del PDF
    html = HTML(
        string=html_string, 
        base_url=settings.BASE_DIR.as_uri()
    )

    response = HttpResponse(content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="cotizacion_{num_reg}.pdf"'

    # Nota: Usamos optimización de imágenes para evitar que el PDF pese demasiado
    html.write_pdf(response)
    return response

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_cotizacion(request, num_reg):
    """
    Elimina una cotización y todos sus registros relacionados.
    """
    try:
        with transaction.atomic():

            # 1. Verificar existencia de la cotización
            cotizacion = DashboardCotizacion.objects.filter(
                num_reg=num_reg
            ).first()

            if not cotizacion:
                return Response(
                    {"error": "La cotización no existe"},
                    status=404
                )

            # 2. Eliminar dependencias
            CotiSuministros.objects.filter(num_reg=num_reg).delete()
            CotiServicios.objects.filter(num_reg=num_reg).delete()
            CotiMensajes.objects.filter(num_reg=num_reg).delete()
            CotiSeguimiento.objects.filter(num_reg=num_reg).delete()

            # 3. Eliminar cotización principal
            cotizacion.delete()

        return Response(
            {"message": "Cotización eliminada correctamente"},
            status=200
        )

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=500
        )

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def enviar_cotizacion_aprobacion(request, num_reg):
    """
    Cambia el estado de envio de la cotización:
    0 -> 1
    1 -> 2
    """
    try:
        with transaction.atomic():
            cotizacion = DashboardCotizacion.objects.filter(num_reg=num_reg).first()

            if not cotizacion:
                return Response({"error": "La cotización no existe"}, status=404)

            # Cambiar valor de envio según el caso
            if cotizacion.envio == 0:
                cotizacion.envio = 1
            elif cotizacion.envio == 1:
                cotizacion.envio = 2
            else:
                return Response({"error": f"Estado de envio inválido: {cotizacion.envio}"}, status=400)

            cotizacion.save()

        return Response({"message": "Cotización enviada a aprobación correctamente"}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def cerrar_cotizacion(request, num_reg):
    """
    Cierra la cotización:
    envio: 2 -> 3
    """
    try:
        with transaction.atomic():
            cotizacion = DashboardCotizacion.objects.filter(num_reg=num_reg).first()

            if not cotizacion:
                return Response(
                    {"error": "La cotización no existe"},
                    status=404
                )

            if cotizacion.envio != 2:
                return Response(
                    {
                        "error": "La cotización no está lista para cerrarse",
                        "estado_actual": cotizacion.envio
                    },
                    status=400
                )

            cotizacion.envio = 3
            cotizacion.save(update_fields=["envio"])

        return Response(
            {"message": "Cotización cerrada correctamente"},
            status=200
        )

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=500
        )

@csrf_exempt
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def asignar_regus(request, num_reg):
    """
    Actualiza los campos 'regus' y 'referencia' de una cotización según num_reg.
    """
    try:
        cotizacion = DashboardCotizacion.objects.get(num_reg=num_reg)
    except DashboardCotizacion.DoesNotExist:
        return Response(
            {"detail": "Cotización no encontrada"},
            status=404
        )

    # Obtener datos del request
    regus = request.data.get("regus")
    referencia = request.data.get("referencia")

    if not regus and not referencia:
        return Response(
            {"detail": "Debe enviar al menos 'regus' o 'referencia' para actualizar"},
            status=400
        )

    campos_a_actualizar = []

    if regus:
        cotizacion.regus = regus
        campos_a_actualizar.append("regus")

    if referencia:
        cotizacion.referencia = referencia
        campos_a_actualizar.append("referencia")

    cotizacion.save(update_fields=campos_a_actualizar)

    return Response(
        {
            "message": "Cotización actualizada correctamente",
            "num_reg": cotizacion.num_reg,
            "regus": cotizacion.regus,
            "referencia": cotizacion.referencia,
        },
        status=200
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_nueva_version_cotizacion(request, num_reg):
    try:
        with transaction.atomic():

            print("🔹 Buscando cotización base")
            base = DashboardCotizacion.objects.filter(num_reg=num_reg).first()
            if not base:
                return Response({"error": "La cotización no existe"}, status=404)

            # 🔒 SOLO SI TIENE COTIN
            if not base.numero:
                return Response(
                    {
                        "error": "La cotización aún no tiene COTIN. No se puede generar una nueva versión."
                    },
                    status=400,
                )

            print("🔹 Generando nuevo cotin")
            nuevo_cotin = siguiente_version(base.numero)

            print("🔹 Creando nueva cotización")
            nueva_cotizacion = deepcopy(base)
            nueva_cotizacion.pk = None
            nueva_cotizacion.num_reg = None
            nueva_cotizacion.numero = nuevo_cotin
            nueva_cotizacion.estado_codigo = 2
            nueva_cotizacion.envio = 0
            nueva_cotizacion.save()

            # =====================================================
            # 🔹 SUMINISTROS (GRUPOS + ÍTEMS)
            # =====================================================
            print("🔹 Replicando SUMINISTROS")

            suministros_origen = list(
                CotiSuministros.objects.filter(num_reg=num_reg).order_by("num")
            )

            ultimo_num = (
                CotiSuministros.objects.aggregate(max_num=Max("num"))["max_num"] or 0
            )

            nuevos = []
            contador = ultimo_num + 1

            for s in suministros_origen:
                nuevo = deepcopy(s)
                nuevo.pk = None
                nuevo.num = contador
                nuevo.num_reg = nueva_cotizacion.num_reg
                nuevos.append(nuevo)
                contador += 1

            CotiSuministros.objects.bulk_create(nuevos)

            # =====================================================
            # 🔹 SERVICIOS (GRUPOS + ÍTEMS)
            # =====================================================
            print("🔹 Replicando SERVICIOS")

            servicios_origen = list(
                CotiServicios.objects.filter(num_reg=num_reg).order_by("num")
            )

            ultimo_num_serv = (
                CotiServicios.objects.aggregate(max_num=Max("num"))["max_num"] or 0
            )

            nuevos_serv = []
            contador = ultimo_num_serv + 1

            for s in servicios_origen:
                nuevo = deepcopy(s)
                nuevo.pk = None
                nuevo.num = contador
                nuevo.num_reg = nueva_cotizacion.num_reg
                nuevos_serv.append(nuevo)
                contador += 1

            CotiServicios.objects.bulk_create(nuevos_serv)

            # =====================================================
            # 🔹 MENSAJES
            # =====================================================
            print("🔹 Replicando MENSAJES")

            mensajes_origen = list(
                CotiMensajes.objects.filter(num_reg=num_reg).order_by("dat")
            )

            offset = 0
            nuevos_mensajes = []

            for m in mensajes_origen:
                nuevo = deepcopy(m)
                nuevo.pk = None
                nuevo.dat = now() + timedelta(milliseconds=offset)
                nuevo.num_reg = nueva_cotizacion.num_reg
                nuevos_mensajes.append(nuevo)
                offset += 1

            CotiMensajes.objects.bulk_create(nuevos_mensajes)

            # =====================================================
            # 🔹 SEGUIMIENTO
            # =====================================================
            print("🔹 Replicando SEGUIMIENTO")

            seguimiento_origen = list(
                CotiSeguimiento.objects.filter(num_reg=num_reg).order_by("dat")
            )

            offset = 0
            nuevos_seg = []

            for seg in seguimiento_origen:
                nuevo = deepcopy(seg)
                nuevo.pk = None
                nuevo.dat = now() + timedelta(milliseconds=offset)
                nuevo.num_reg = nueva_cotizacion.num_reg
                nuevo.num = seg.num
                nuevos_seg.append(nuevo)
                offset += 1

            CotiSeguimiento.objects.bulk_create(nuevos_seg)

        return Response(
            {
                "message": "Nueva versión creada correctamente",
                "num_reg": nueva_cotizacion.num_reg,
                "cotin": nueva_cotizacion.numero,
                "num_reg_origen": base.num_reg,  # 👈 útil para invalidaciones finas
            },
            status=201,
        )

    except Exception as e:
        print("❌ ERROR REAL:", e)
        raise e

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generar_copiar_cotizacion(request, num_reg):
    """
    Crea una copia de la cotización indicada sin asignarle COTIN (numero).
    La copia se genera con estado pendiente de envío (estado_codigo=2).
    """
    try:
        with transaction.atomic():

            print("🔹 Buscando cotización base")
            base = DashboardCotizacion.objects.filter(num_reg=num_reg).first()
            if not base:
                return Response({"error": "La cotización no existe"}, status=404)

            print("🔹 Creando copia sin COTIN")
            nueva_cotizacion = deepcopy(base)
            nueva_cotizacion.pk = None
            nueva_cotizacion.num_reg = None
            nueva_cotizacion.numero = None          # ❌ No asignamos COTIN
            nueva_cotizacion.estado_codigo = 2      # Pendiente de envío
            nueva_cotizacion.envio = 0

            # =========================
            # 🔹 REFERENCIA (MARCAR COPIA)
            # =========================
            if base.referencia:
                nueva_cotizacion.referencia = f"{base.referencia} - COPIA"
            else:
                nueva_cotizacion.referencia = f"COPIA DE COTIZACIÓN {num_reg}"

            nueva_cotizacion.save()

            # =====================================================
            # 🔹 SUMINISTROS (GRUPOS + ÍTEMS)
            # =====================================================
            print("🔹 Replicando SUMINISTROS")

            suministros_origen = list(
                CotiSuministros.objects.filter(num_reg=num_reg).order_by("num")
            )

            ultimo_num = (
                CotiSuministros.objects.aggregate(max_num=Max("num"))["max_num"] or 0
            )

            nuevos = []
            contador = ultimo_num + 1

            for s in suministros_origen:
                nuevo = deepcopy(s)
                nuevo.pk = None
                nuevo.num = contador
                nuevo.num_reg = nueva_cotizacion.num_reg
                nuevos.append(nuevo)
                contador += 1

            CotiSuministros.objects.bulk_create(nuevos)

            # =====================================================
            # 🔹 SERVICIOS (GRUPOS + ÍTEMS)
            # =====================================================
            print("🔹 Replicando SERVICIOS")

            servicios_origen = list(
                CotiServicios.objects.filter(num_reg=num_reg).order_by("num")
            )

            ultimo_num_serv = (
                CotiServicios.objects.aggregate(max_num=Max("num"))["max_num"] or 0
            )

            nuevos_serv = []
            contador = ultimo_num_serv + 1

            for s in servicios_origen:
                nuevo = deepcopy(s)
                nuevo.pk = None
                nuevo.num = contador
                nuevo.num_reg = nueva_cotizacion.num_reg
                nuevos_serv.append(nuevo)
                contador += 1

            CotiServicios.objects.bulk_create(nuevos_serv)

            # =====================================================
            # 🔹 MENSAJES
            # =====================================================
            print("🔹 Replicando MENSAJES")

            mensajes_origen = list(
                CotiMensajes.objects.filter(num_reg=num_reg).order_by("dat")
            )

            offset = 0
            nuevos_mensajes = []

            for m in mensajes_origen:
                nuevo = deepcopy(m)
                nuevo.pk = None
                nuevo.dat = now() + timedelta(milliseconds=offset)
                nuevo.num_reg = nueva_cotizacion.num_reg
                nuevos_mensajes.append(nuevo)
                offset += 1

            CotiMensajes.objects.bulk_create(nuevos_mensajes)

            # =====================================================
            # 🔹 SEGUIMIENTO
            # =====================================================
            print("🔹 Replicando SEGUIMIENTO")

            seguimiento_origen = list(
                CotiSeguimiento.objects.filter(num_reg=num_reg).order_by("dat")
            )

            offset = 0
            nuevos_seg = []

            for seg in seguimiento_origen:
                nuevo = deepcopy(seg)
                nuevo.pk = None
                nuevo.dat = now() + timedelta(milliseconds=offset)
                nuevo.num_reg = nueva_cotizacion.num_reg
                nuevo.num = seg.num
                nuevos_seg.append(nuevo)
                offset += 1

            CotiSeguimiento.objects.bulk_create(nuevos_seg)

        return Response(
            {
                "message": "Copia de cotización creada correctamente sin COTIN",
                "num_reg": nueva_cotizacion.num_reg,
                "cotin": nueva_cotizacion.numero,  # será None
            },
            status=201,
        )

    except Exception as e:
        print("❌ ERROR REAL:", e)
        raise e

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generar_codigo_view(request, numero):
    """
    Retorna el código (cotin) asociado a la cotización.
    Si la cotización no existe → 404
    """
    try:
        cot = DashboardCotizacion.objects.filter(numero=numero).first()
        if not cot:
            return Response(
                {"error": f"No se encontró la cotización #{numero}"},
                status=404
            )

        return Response({
            "numero": cot.numero,
            "codigo": cot.numero  # Es lo mismo que cotin
        })

    except Exception as e:
        import traceback
        print("Error en generar_codigo_view:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def cambiar_estado_cotizacion(request, num_reg):
    """
    Cambia el estado de una cotización al estado indicado.
    Ejemplo: 1 → 3, 3 → 2, etc.
    """
    try:
        estado_codigo = request.data.get("estado_codigo")

        if estado_codigo is None:
            return Response(
                {"error": "Debe enviar estado_codigo"},
                status=400
            )

        with transaction.atomic():
            cotizacion = DashboardCotizacion.objects.filter(num_reg=num_reg).first()

            if not cotizacion:
                return Response(
                    {"error": "La cotización no existe"},
                    status=404
                )

            # Validar que el estado exista y esté activo
            estado = vc_tab_estado.objects.filter(
                codigo=estado_codigo,
                activo=True
            ).first()

            if not estado:
                return Response(
                    {"error": "Estado inválido o inactivo"},
                    status=400
                )

            cotizacion.estado_codigo = estado.codigo
            cotizacion.save()

        return Response(
            {"message": "Estado de la cotización actualizado correctamente"},
            status=200
        )

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=500
        )

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def retornar_cotizacion(request, num_reg):
    """
    Retorna una cotización a estado editable.
    Acción: envio = 0
    """

    try:
        with transaction.atomic():
            cotizacion = DashboardCotizacion.objects.filter(num_reg=num_reg).first()

            if not cotizacion:
                return Response(
                    {"error": "La cotización no existe"},
                    status=404
                )

            # 🔒 Opcional: validar que esté enviada
            if cotizacion.envio == 0:
                return Response(
                    {"message": "La cotización ya está en estado editable"},
                    status=200
                )

            cotizacion.envio = 0
            cotizacion.save(update_fields=["envio"])

        return Response(
            {"message": "La cotización fue retornada correctamente"},
            status=200
        )

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=500
        )

##================##
## DATOS DE BD_VC ##
##================##
# vc_tab_areas
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_areas(request):
    areas = vc_tab_areas.objects.filter(activo=True).order_by("nombre")
    serializer = AreasSerializer(areas, many=True)
    return Response(serializer.data)

# vc_tab_clientes
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_clientes(request):
    clientes = vc_tab_clientes.objects.filter(activo=True).order_by("nombre")
    serializer = ClientesSerializer(clientes, many=True)
    return Response(serializer.data)

# vc_tab_estado
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_estados(request):
    estados = vc_tab_estado.objects.filter(activo=True, cot=1).order_by("nombre")
    serializer = EstadoSerializer(estados, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_categorias(request):
    categorias = vc_tab_categorias.objects.filter(activo="1").order_by("nombre")
    serializer = CategoriasSerializer(categorias, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_tgasto(request):
    tgasto = vc_tab_tgastos.objects.filter(activo="1").order_by("codigo")
    serializer = TGastosSerializer(tgasto, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_tgasto_d(request):
    tgasto_d = vc_tab_tgastos_d.objects.filter(activo="1").order_by("nombre")
    serializer = TGastosDSerializer(tgasto_d, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_rittal(request):
    search = request.GET.get("search")
    limit = int(request.GET.get("limit", 15))

    queryset = vc_tab_rittal.objects.filter(activo="1")

    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search)
        )

    queryset = queryset.order_by("nombre")[:limit]
    serializer = RittalSerializer(queryset, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_rockwell(request):
    search = (request.GET.get("search") or "").strip()
    limit = int(request.GET.get("limit", 15))

    queryset = vc_tab_rockwell.objects.filter(activo="1")

    if search:
        queryset = queryset.filter(
            Q(codigo__icontains=search) |
            Q(codigo2__icontains=search) |
            Q(descripcion__icontains=search) |
            Q(ds__icontains=search)
        )

    queryset = queryset.order_by("codigo")[:limit]

    serializer = RockwellSerializer(queryset, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_ceyesa(request):
    search = request.GET.get("search")
    limit = int(request.GET.get("limit", 15))

    queryset = vc_tab_ceyesa.objects.filter(activo="1")

    if search:
        queryset = queryset.filter(
            Q(descripcion__icontains=search) |
            Q(codigo__icontains=search)
        )

    queryset = queryset.order_by("codigo")[:limit]
    serializer = CeyesaSerializer(queryset, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_hoffman(request):
    search = request.GET.get("search")
    limit = int(request.GET.get("limit", 15))

    queryset = vc_tab_hoffman.objects.filter(activo="1")

    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search)
        )

    queryset = queryset.order_by("nombre")[:limit]
    serializer = HoffmanSerializer(queryset, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_alm_articulos(request):
    search = request.GET.get("search", "").strip()
    proveedor = request.GET.get("proveedor")  # OTROS | Schneider | LS Industrial Systems
    limit = int(request.GET.get("limit", 15))

    queryset = alm_articulos.objects.all()

    # =========================
    # FILTRO POR PROVEEDOR
    # =========================
    if proveedor == "OTROS":
        queryset = queryset.filter(proveedor__isnull=True)
    elif proveedor:
        queryset = queryset.filter(proveedor__iexact=proveedor)

    # =========================
    # BUSQUEDA
    # =========================
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search)
        )

    queryset = queryset.order_by("nombre")[:limit]

    serializer = AlmArticulosSerializer(queryset, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_proveedores(request):
    proveedores = vc_tab_tproveedor.objects.filter(activo="1").order_by("nombre")
    serializer = ProveedoresSerializer(proveedores, many=True)
    return Response(serializer.data)

# seg_usuario
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_usuario(request):
    """
    Retorna los datos del usuario autenticado actual.
    """
    try:
        usuario = seg_usuario.objects.get(usuario_usu=request.user.username)
        serializer = SegUsuarioSerializer(usuario)
        return Response(serializer.data)
    except seg_usuario.DoesNotExist:
        return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

##==========##
## REPORTES ##
##==========##
@csrf_exempt
def reporte_cotizaciones_dashboard_html(request):
    # =========================
    # Filtros
    # =========================
    anno    = request.GET.get("anno")
    mes     = request.GET.get("mes")
    estado  = request.GET.get("estado")
    cliente = request.GET.get("cliente")
    area    = request.GET.get("area")
    campo   = request.GET.get("campo")   # filtro general
    valor   = request.GET.get("valor")   # valor buscado

    qs = DashboardCotizacion.objects.all()

    if anno:
        qs = qs.filter(anno=anno)
    if mes and mes != "%":
        qs = qs.filter(mes=mes)
    if estado and estado != "%":
        qs = qs.filter(estado_codigo=estado)
    if cliente and cliente != "%":
        qs = qs.filter(cliente_codigo=cliente)
    if area and area != "%":
        qs = qs.filter(area_codigo=area)

    # Filtro general dinámico
    if campo and valor:
        filtro_dinamico = {f"{campo}__icontains": valor}
        qs = qs.filter(**filtro_dinamico)

    # =========================
    # Agrupación por área
    # =========================
    data = (
        qs.values("area_codigo")
        .annotate(
            cantidad=Count("num_reg"),
            importe=Sum("tot_c")
        )
        .order_by("area_codigo")
    )

    AREA_MAP = {
        "1": "Industria",
        "2": "Minería",
        "3": "Mantenimiento",
        "4": "Petroquímica",
        "8": "Seguridad de Maquinaria",
    }

    resultados = []
    total_general = Decimal("0.00")

    for row in data:
        importe = row["importe"] or Decimal("0.00")
        total_general += importe
        resultados.append({
            "area": AREA_MAP.get(row["area_codigo"], "Sin Área"),
            "cantidad": row["cantidad"],
            "importe": round(importe, 2),
        })

    context = {
        "resultados": resultados,
        "total_general": round(total_general, 2),
        "filtros": {
            "anno": anno,
            "mes": mes,
            "estado": estado,
            "cliente": cliente,
            "area": area,
            "campo": campo,
            "valor": valor,
        }
    }

    return render(request, "reportes/reporte_cotizaciones_dashboard.html", context)

@csrf_exempt
def reporte_suministros_html(request, num_reg):

    suministros = (
        CotiSuministros.objects
        .filter(num_reg=num_reg)
        .order_by("cog", "nig", "num")
    )

    if not suministros.exists():
        return HttpResponse(
            "No existen suministros para esta cotización",
            status=404
        )

    grupos = OrderedDict()

    # =========================
    # UTIL: PARSE COG
    # =========================
    def parse_cog(cog):
        cog = str(cog).zfill(4)
        tipo_code = cog[2:]  # 01, 02

        return {
            "01": "EQUIPOS",
            "02": "MATERIALES",
        }.get(tipo_code, "OTROS")

    # =========================
    # AGRUPAR POR COG
    # =========================
    for row in suministros:

        # Crear grupo si no existe
        if row.cog not in grupos:
            grupos[row.cog] = {
                "tipo": parse_cog(row.cog),  # EQUIPOS / MATERIALES
                "titulo": "",                # nog (ej: M1, M2)
                "items": []
            }

        # CABECERA (nig = 0)
        if row.nig == 0:
            grupos[row.cog]["titulo"] = row.nog or ""

        # ITEMS (nig > 0)
        elif row.nig > 0:
            utilidad = (row.tou or Decimal("0")) * (row.can or Decimal("0"))

            grupos[row.cog]["items"].append({
                "item": len(grupos[row.cog]["items"]) + 1,
                "cod": row.cod,
                "des": row.des,
                "pro": row.pro,
                "can": round(row.can or 0, 2),
                "val": round(row.val or 0, 2),
                "tot": round(row.tot or 0, 2),
                "puc": round(row.puc or 0, 2),
                "toc": round(row.toc or 0, 2),
                "utilidad": round(utilidad, 2),
            })

    context = {
        "num_reg": num_reg,
        "grupos": grupos
    }

    return render(
        request,
        "reportes/reporte_suministros.html",
        context
    )

@csrf_exempt
def reporte_suministros_excel(request, num_reg):
    suministros = CotiSuministros.objects.filter(num_reg=num_reg).order_by("cog", "nig", "num")
    if not suministros.exists():
        return HttpResponse("No existen suministros para esta cotización", status=404)

    grupos = OrderedDict()

    # Función para parsear cog
    def parse_cog(cog):
        cog = str(cog).zfill(4)
        contador = cog[:2]
        tipo_code = cog[2:]
        tipo_map = {
            "01": "EQUIPOS",
            "02": "MATERIALES",
        }
        tipo = tipo_map.get(tipo_code, "OTROS")
        subtitulo = f"M{int(contador)}"
        return tipo, subtitulo

    # Agrupar por COG
    for row in suministros:
        if row.cog not in grupos:
            tipo, subtitulo = parse_cog(row.cog)
            grupos[row.cog] = {
                "tipo": tipo,
                "subtitulo": subtitulo,
                "titulo": "",
                "items": []
            }

        # Cabecera (nig = 0)
        if row.nig == 0:
            grupos[row.cog]["titulo"] = row.nog or ""

        # Items (nig > 0)
        elif row.nig > 0:
            utilidad = (row.tou or Decimal("0")) * (row.can or Decimal("0"))
            grupos[row.cog]["items"].append({
                "item": len(grupos[row.cog]["items"]) + 1,
                "cod": row.cod,
                "des": row.des,
                "pro": row.pro,
                "can": round(row.can or 0, 2),
                "val": round(row.val or 0, 2),
                "tot": round(row.tot or 0, 2),
                "puc": round(row.puc or 0, 2),
                "toc": round(row.toc or 0, 2),
                "utilidad": round(utilidad, 2),
            })

    # Crear workbook
    wb = Workbook()
    ws = wb.active
    ws.title = f"Suministros_{num_reg}"

    # Escribir tabla similar al HTML
    row_index = 1
    for grupo in grupos.values():
        # Título de grupo
        ws.merge_cells(start_row=row_index, start_column=1, end_row=row_index, end_column=10)
        ws.cell(row=row_index, column=1, value=f"{grupo['tipo']} - {grupo['titulo']}")
        row_index += 1

        # Cabecera
        headers_1 = ["Ítems", "Código", "Descripción", "Proveedor", "Cant", "Cliente Final", "", "Precio Final", "", "Utilidad"]
        headers_2 = ["", "", "", "", "", "Prec. Unit.", "Total", "Prec. Unit.", "Total", ""]
        ws.append(headers_1)
        ws.append(headers_2)
        row_index += 2

        # Items
        for it in grupo["items"]:
            ws.append([
                it["item"],
                it["cod"],
                it["des"],
                it["pro"],
                it["can"],
                it["val"],
                it["tot"],
                it["puc"],
                it["toc"],
                it["utilidad"]
            ])
            row_index += 1

        row_index += 1  # espacio entre grupos

    # Respuesta Excel
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename=Suministros_{num_reg}.xlsx'
    wb.save(response)
    return response

@csrf_exempt
def reporte_servicios_html(request, num_reg):
    servicios = (
        CotiServicios.objects
        .filter(num_reg=num_reg)
        .order_by("cog", "nig", "num")
    )

    if not servicios.exists():
        return HttpResponse(
            "No existen servicios para esta cotización",
            status=404
        )

    grupos = OrderedDict()

    # =========================
    # AGRUPAR POR GRUPO Y SUBGRUPO
    # =========================
    for row in servicios:
        cog_key = str(row.cog).zfill(5)  # ej: 01041

        # Grupo principal (nig=0)
        if row.nig == 0:
            grupos[cog_key] = {
                "titulo": row.nog or "",
                "subgrupos": OrderedDict(),
                "total_val": Decimal("0.00"),
                "total_tot": Decimal("0.00"),
                "total_puc": Decimal("0.00"),
                "total_toc": Decimal("0.00"),
                "total_utilidad": Decimal("0.00"),
            }

        # Subgrupo (nig=1)
        elif row.nig == 1:
            tipo_code = cog_key[-2:]
            tipo = {
                "04": "MANO DE OBRA",
                "05": "GASTOS DE SERVICIOS",
                "06": "OTROS"
            }.get(tipo_code, "OTROS")

            ultimo_grupo_key = list(grupos.keys())[-1]
            grupos[ultimo_grupo_key]["subgrupos"][cog_key] = {
                "tipo": tipo,
                "items": [],
                "sub_total_val": Decimal("0.00"),
                "sub_total_tot": Decimal("0.00"),
                "sub_total_puc": Decimal("0.00"),
                "sub_total_toc": Decimal("0.00"),
                "sub_total_utilidad": Decimal("0.00"),
            }

        # Items (nig=2)
        elif row.nig == 2:
            utilidad = (row.tou or Decimal("0")) * (row.tde or Decimal("0"))
            ultimo_grupo_key = list(grupos.keys())[-1]
            ultimo_subgrupo_key = list(grupos[ultimo_grupo_key]["subgrupos"].keys())[-1]

            item_data = {
                "item": len(grupos[ultimo_grupo_key]["subgrupos"][ultimo_subgrupo_key]["items"]) + 1,
                "cod": row.cod,
                "des": row.des,
                "pro": row.pro,
                "can": round(row.can or 0, 2),
                "dias": round(row.tde or 0, 0),
                "val": round(row.val or 0, 2),
                "tot": round(row.tot or 0, 2),
                "puc": round(row.puc or 0, 2),
                "toc": round(row.toc or 0, 2),
                "utilidad": round(utilidad, 2),
            }

            # Guardar item
            grupos[ultimo_grupo_key]["subgrupos"][ultimo_subgrupo_key]["items"].append(item_data)

            # Actualizar totales subgrupo
            sg = grupos[ultimo_grupo_key]["subgrupos"][ultimo_subgrupo_key]
            sg["sub_total_val"] += Decimal(str(item_data["val"]))
            sg["sub_total_tot"] += Decimal(str(item_data["tot"]))
            sg["sub_total_puc"] += Decimal(str(item_data["puc"]))
            sg["sub_total_toc"] += Decimal(str(item_data["toc"]))
            sg["sub_total_utilidad"] += Decimal(str(item_data["utilidad"]))

            # Actualizar totales grupo
            g = grupos[ultimo_grupo_key]
            g["total_val"] += Decimal(str(item_data["val"]))
            g["total_tot"] += Decimal(str(item_data["tot"]))
            g["total_puc"] += Decimal(str(item_data["puc"]))
            g["total_toc"] += Decimal(str(item_data["toc"]))
            g["total_utilidad"] += Decimal(str(item_data["utilidad"]))


    context = {
        "num_reg": num_reg,
        "grupos": grupos
    }

    return render(
        request,
        "reportes/reporte_servicios.html",
        context
    )

from django.db import connection

def sp_select_tabla_call(num_reg, area, tipo):
    with connection.cursor() as cursor:
        cursor.execute("CALL sp_select_tabla(%s, %s, %s)", [num_reg, area, tipo])
        row = cursor.fetchone()
        if row and row[0]:
            try:
                costo_str, ganancia_str = row[0].split("-")
                return Decimal(costo_str), Decimal(ganancia_str)
            except Exception:
                # Si el formato no es el esperado
                return Decimal("0"), Decimal("0")
        # Si no hay fila o es None
        return Decimal("0"), Decimal("0")

def sumatoria_costos(queryset):

    total_expr = ExpressionWrapper(
        F("tot") * F("can"),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )

    agg = queryset.aggregate(
        costo=Coalesce(Sum("toc"), Decimal("0")),
        total=Coalesce(Sum(total_expr), Decimal("0")),
    )

    ganancia = agg["total"] - agg["costo"]

    return agg["costo"], ganancia

@csrf_exempt
def reporte_detallado_cotizacion(request, num_reg):
    num_reg = str(num_reg)

    # ==========================================================
    # EQUIPOS (SU0 - nig=0 - cog 01%)
    # ==========================================================
    # 🔹 TOTAL VENTA
    qs_total = CotiSuministros.objects.filter(
        num_reg=num_reg,
        cog__endswith="01",
        nig=0,
    )

    total_expr = ExpressionWrapper(
        F("tot") * F("can"),
        output_field=DecimalField(max_digits=18, decimal_places=2),
    )

    agg_total = qs_total.aggregate(
        total=Coalesce(Sum(total_expr), Decimal("0"))
    )

    total_equipos = agg_total["total"]

    # 🔹 COSTO
    qs_costo = CotiSuministros.objects.filter(
        num_reg=num_reg,
        cog__endswith="01",
        nig=1,
    )

    agg_costo = qs_costo.aggregate(
        costo=Coalesce(Sum("toc"), Decimal("0"))
    )

    costo_equipos = agg_costo["costo"]

    # 🔹 GANANCIA
    ganancia_equipos = total_equipos - costo_equipos

    # ==========================================================
    # MATERIALES (02%)
    # ==========================================================
    # 🔹 TOTAL VENTA
    qs_total = CotiSuministros.objects.filter(
        num_reg=num_reg,
        cog__endswith="02",
        nig=0,
    )

    total_expr = ExpressionWrapper(
        F("tot") * F("can"),
        output_field=DecimalField(max_digits=18, decimal_places=2),
    )

    agg_total = qs_total.aggregate(
        total=Coalesce(Sum(total_expr), Decimal("0"))
    )

    total_materiales = agg_total["total"]

    # 🔹 COSTO
    qs_costo = CotiSuministros.objects.filter(
        num_reg=num_reg,
        cog__endswith="02",
        nig=1,
    )

    agg_costo = qs_costo.aggregate(
        costo=Coalesce(Sum("toc"), Decimal("0"))
    )

    costo_materiales = agg_costo["costo"]

    # 🔹 GANANCIA
    ganancia_materiales = total_materiales - costo_materiales

    # =========
    # AREA
    # =========
    from django.shortcuts import get_object_or_404

    cotizacion = get_object_or_404(DashboardCotizacion, num_reg=num_reg)

    area_cotizacion = str(cotizacion.area_codigo)

    # ==========================================================
    # HH PROPIOS (MOP → cog ???4)
    # ==========================================================
    qs = CotiServicios.objects.filter(
        num_reg=num_reg,
        cog__regex=r"^\d{3}4",
        tpr=area_cotizacion,
        nig=2,
    )

    total_hh_propios = qs.aggregate(
        total=Coalesce(
            Sum("tot"),
            Decimal("0.00"),
            output_field=DecimalField(max_digits=18, decimal_places=2),
        )
    )["total"]

    costo_hh_propios = qs.aggregate(
        costo=Coalesce(
            Sum("toc"),
            Decimal("0.00"),
            output_field=DecimalField(max_digits=18, decimal_places=2),
        )
    )["costo"]

    ganancia_hh_propios = total_hh_propios - costo_hh_propios

    # ==========================================================
    # HH OTRAS AREAS (MOI → cog ???6, área distinta)
    # ==========================================================
    qs_total_otras = CotiServicios.objects.filter(
        num_reg=num_reg,
        cog__regex=r"^\d{3}6",
        nig=0,
    )

    total_expr_otras = ExpressionWrapper(
        F("tot") * F("can"),
        output_field=DecimalField(max_digits=18, decimal_places=2)
    )

    total_hh_otras = qs_total_otras.aggregate(
        total=Coalesce(Sum(total_expr_otras), Decimal("0"))
    )["total"]

    qs_costo_otras = CotiServicios.objects.filter(
        num_reg=num_reg,
        cog__regex=r"^\d{3}6",
        nig=1,
    )

    costo_hh_otras = qs_costo_otras.aggregate(
        costo=Coalesce(Sum("toc"), Decimal("0"))
    )["costo"]

    ganancia_hh_otras = total_hh_otras - costo_hh_otras

    # ==========================================================
    # COSTO SERVICIOS (05%)
    # ==========================================================
    qs_base = CotiServicios.objects.filter(
        num_reg=num_reg,
        mov="05",
    )

    total_servicios = qs_base.filter(nig=1).aggregate(
        total=Coalesce(
            Sum("tot"),
            Decimal("0.00"),
            output_field=DecimalField(max_digits=18, decimal_places=2),
        )
    )["total"]

    costo_servicios = qs_base.filter(nig=2).aggregate(
        costo=Coalesce(
            Sum("toc"),
            Decimal("0.00"),
            output_field=DecimalField(max_digits=18, decimal_places=2),
        )
    )["costo"]

    ganancia_servicios = total_servicios - costo_servicios

    # ==========================================================
    # GASTOS ENTREGA (00%)
    # ==========================================================
    qs_base = CotiServicios.objects.filter(
        num_reg=num_reg,
        mov="00",
    )

    total_gastos_entrega = qs_base.filter(nig=1).aggregate(
        total=Coalesce(
            Sum("tot"),
            Decimal("0.00"),
            output_field=DecimalField(max_digits=18, decimal_places=2),
        )
    )["total"]

    costo_gastos_entrega = qs_base.filter(nig=2).aggregate(
        costo=Coalesce(
            Sum("toc"),
            Decimal("0.00"),
            output_field=DecimalField(max_digits=18, decimal_places=2),
        )
    )["costo"]

    ganancia_gastos_entrega = total_gastos_entrega - costo_gastos_entrega

    # ==========================================================
    # IMPREVISTOS (06%)
    # ==========================================================
    qs_base = CotiServicios.objects.filter(
        num_reg=num_reg,
        mov="06",
    )

    total_imprevistos = qs_base.filter(nig=1).aggregate(
        total=Coalesce(
            Sum("tot"),
            Decimal("0.00"),
            output_field=DecimalField(max_digits=18, decimal_places=2),
        )
    )["total"]

    costo_imprevistos = qs_base.filter(nig=2).aggregate(
        costo=Coalesce(
            Sum("toc"),
            Decimal("0.00"),
            output_field=DecimalField(max_digits=18, decimal_places=2),
        )
    )["costo"]

    ganancia_imprevistos = total_imprevistos - costo_imprevistos

    # ==========================================================
    # DESCUENTO
    # ==========================================================
    cotizacion = DashboardCotizacion.objects.only("des_m").get(num_reg=num_reg)

    costo_descuento = cotizacion.des_m or Decimal("0.00")

    ganancia_descuento = Decimal("0.00")

    total_descuento = -costo_descuento

    # ==========================================================
    # TABLA FINAL
    # ==========================================================
    datos = [
        {"concepto": "EQUIPOS", "costo": costo_equipos, "ganancia": ganancia_equipos, "total": costo_equipos + ganancia_equipos},
        {"concepto": "MATERIALES", "costo": costo_materiales, "ganancia": ganancia_materiales, "total": costo_materiales + ganancia_materiales},
        {"concepto": "HH PROPIOS", "costo": costo_hh_propios, "ganancia": ganancia_hh_propios, "total": costo_hh_propios + ganancia_hh_propios},
        {"concepto": "HH OTRAS AREAS", "costo": costo_hh_otras, "ganancia": ganancia_hh_otras, "total": costo_hh_otras + ganancia_hh_otras},
        {"concepto": "COSTO SERVICIOS", "costo": costo_servicios, "ganancia": ganancia_servicios, "total": costo_servicios + ganancia_servicios},
        {"concepto": "GASTOS ENTREGA", "costo": costo_gastos_entrega, "ganancia": ganancia_gastos_entrega, "total": costo_gastos_entrega + ganancia_gastos_entrega},
        {"concepto": "IMPREVISTOS", "costo": costo_imprevistos, "ganancia": ganancia_imprevistos, "total": costo_imprevistos + ganancia_imprevistos},
        {"concepto": "DESCUENTO", "costo": costo_descuento, "ganancia": ganancia_descuento, "total": total_descuento},
    ]

    total_final = sum(d["total"] for d in datos)

    context = {
        "num_reg": num_reg,
        "titulo": "RESUMEN DE COSTO UTILIDAD",
        "proyecto": num_reg,
        "datos": datos,
        "total_final": total_final,
    }

    return render(
        request,
        "reportes/reporte_detallado_cotizacion.html",
        context,
    )

@csrf_exempt
def reporte_detallado_excel(request, num_reg):
    num_reg = str(num_reg)

    # === CALCULOS (igual que tu versión) ===
    qs_total = CotiSuministros.objects.filter(num_reg=num_reg, cog__endswith="01", nig=0)
    total_equipos = qs_total.aggregate(total=Coalesce(Sum(F("tot") * F("can")), Decimal("0")))["total"]
    qs_costo = CotiSuministros.objects.filter(num_reg=num_reg, cog__endswith="01", nig=1)
    costo_equipos = qs_costo.aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_equipos = total_equipos - costo_equipos

    qs_total = CotiSuministros.objects.filter(num_reg=num_reg, cog__endswith="02", nig=0)
    total_materiales = qs_total.aggregate(total=Coalesce(Sum(F("tot") * F("can")), Decimal("0")))["total"]
    qs_costo = CotiSuministros.objects.filter(num_reg=num_reg, cog__endswith="02", nig=1)
    costo_materiales = qs_costo.aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_materiales = total_materiales - costo_materiales

    cotizacion = DashboardCotizacion.objects.only("des_m", "area_codigo").get(num_reg=num_reg)
    area_cotizacion = str(cotizacion.area_codigo)

    qs = CotiServicios.objects.filter(num_reg=num_reg, cog__regex=r"^\d{3}4", tpr=area_cotizacion, nig=2)
    total_hh_propios = qs.aggregate(total=Coalesce(Sum("tot"), Decimal("0")))["total"]
    costo_hh_propios = qs.aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_hh_propios = total_hh_propios - costo_hh_propios

    qs_total_otras = CotiServicios.objects.filter(num_reg=num_reg, cog__regex=r"^\d{3}6", nig=0)
    total_hh_otras = qs_total_otras.aggregate(total=Coalesce(Sum(F("tot") * F("can")), Decimal("0")))["total"]
    qs_costo_otras = CotiServicios.objects.filter(num_reg=num_reg, cog__regex=r"^\d{3}6", nig=1)
    costo_hh_otras = qs_costo_otras.aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_hh_otras = total_hh_otras - costo_hh_otras

    qs_base = CotiServicios.objects.filter(num_reg=num_reg, mov="05")
    total_servicios = qs_base.filter(nig=1).aggregate(total=Coalesce(Sum("tot"), Decimal("0")))["total"]
    costo_servicios = qs_base.filter(nig=2).aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_servicios = total_servicios - costo_servicios

    qs_base = CotiServicios.objects.filter(num_reg=num_reg, mov="00")
    total_gastos_entrega = qs_base.filter(nig=1).aggregate(total=Coalesce(Sum("tot"), Decimal("0")))["total"]
    costo_gastos_entrega = qs_base.filter(nig=2).aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_gastos_entrega = total_gastos_entrega - costo_gastos_entrega

    qs_base = CotiServicios.objects.filter(num_reg=num_reg, mov="06")
    total_imprevistos = qs_base.filter(nig=1).aggregate(total=Coalesce(Sum("tot"), Decimal("0")))["total"]
    costo_imprevistos = qs_base.filter(nig=2).aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_imprevistos = total_imprevistos - costo_imprevistos

    costo_descuento = cotizacion.des_m or Decimal("0.00")
    ganancia_descuento = Decimal("0.00")
    total_descuento = -costo_descuento

    datos = [
        {"concepto": "EQUIPOS", "costo": costo_equipos, "ganancia": ganancia_equipos, "total": costo_equipos + ganancia_equipos},
        {"concepto": "MATERIALES", "costo": costo_materiales, "ganancia": ganancia_materiales, "total": costo_materiales + ganancia_materiales},
        {"concepto": "HH PROPIOS", "costo": costo_hh_propios, "ganancia": ganancia_hh_propios, "total": costo_hh_propios + ganancia_hh_propios},
        {"concepto": "HH OTRAS AREAS", "costo": costo_hh_otras, "ganancia": ganancia_hh_otras, "total": costo_hh_otras + ganancia_hh_otras},
        {"concepto": "COSTO SERVICIOS", "costo": costo_servicios, "ganancia": ganancia_servicios, "total": costo_servicios + ganancia_servicios},
        {"concepto": "GASTOS ENTREGA", "costo": costo_gastos_entrega, "ganancia": ganancia_gastos_entrega, "total": costo_gastos_entrega + ganancia_gastos_entrega},
        {"concepto": "IMPREVISTOS", "costo": costo_imprevistos, "ganancia": ganancia_imprevistos, "total": costo_imprevistos + ganancia_imprevistos},
        {"concepto": "DESCUENTO", "costo": costo_descuento, "ganancia": ganancia_descuento, "total": total_descuento},
    ]

    # === GENERAR EXCEL CON DISEÑO ===
    wb = Workbook()
    ws = wb.active
    ws.title = f"Detalle_{num_reg}"

    # Cabecera
    ws.append(["Concepto", "Costo", "Ganancia", "Total"])
    header_fill = PatternFill("solid", fgColor="BDD7EE")
    thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

    for cell in ws[1]:
        cell.font = Font(bold=True, color="000000")
        cell.alignment = Alignment(horizontal="center")
        cell.fill = header_fill
        cell.border = thin_border

    # Filas de datos
    for d in datos:
        ws.append([d["concepto"], float(d["costo"]), float(d["ganancia"]), float(d["total"])])

    for row in ws.iter_rows(min_row=2, min_col=1, max_col=4):
        row[0].alignment = Alignment(horizontal="left")
        for cell in row[1:]:
            cell.alignment = Alignment(horizontal="right")
        for cell in row:
            cell.border = thin_border

    # Autoajustar ancho de columnas
    for col in ws.columns:
        max_length = max(len(str(cell.value)) if cell.value is not None else 0 for cell in col)
        ws.column_dimensions[col[0].column_letter].width = max_length + 5

    # Respuesta
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename=Detalle_{num_reg}.xlsx'
    wb.save(response)
    return response

@csrf_exempt
def reporte_resumen_cotizacion(request, num_reg):
    num_reg = str(num_reg)

    # --------------------------
    # REUTILIZAR CÁLCULOS DETALLE
    # --------------------------
    # Equipos
    qs_total = CotiSuministros.objects.filter(num_reg=num_reg, cog__endswith="01", nig=0)
    total_equipos = qs_total.aggregate(total=Coalesce(Sum(F("tot")*F("can")), Decimal("0")))["total"]
    qs_costo = CotiSuministros.objects.filter(num_reg=num_reg, cog__endswith="01", nig=1)
    costo_equipos = qs_costo.aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_equipos = total_equipos - costo_equipos

    # Materiales
    qs_total = CotiSuministros.objects.filter(num_reg=num_reg, cog__endswith="02", nig=0)
    total_materiales = qs_total.aggregate(total=Coalesce(Sum(F("tot")*F("can")), Decimal("0")))["total"]
    qs_costo = CotiSuministros.objects.filter(num_reg=num_reg, cog__endswith="02", nig=1)
    costo_materiales = qs_costo.aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_materiales = total_materiales - costo_materiales

    # Área
    cotizacion = get_object_or_404(DashboardCotizacion, num_reg=num_reg)
    area_cotizacion = str(cotizacion.area_codigo)

    # HH propios
    qs_hh_propios = CotiServicios.objects.filter(num_reg=num_reg, cog__regex=r"^\d{3}4", tpr=area_cotizacion, nig=2)
    total_hh_propios = qs_hh_propios.aggregate(total=Coalesce(Sum("tot"), Decimal("0")))["total"]
    costo_hh_propios = qs_hh_propios.aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_hh_propios = total_hh_propios - costo_hh_propios

    # HH otras áreas
    qs_hh_otras = CotiServicios.objects.filter(num_reg=num_reg, cog__regex=r"^\d{3}6", nig=1)
    costo_hh_otras = qs_hh_otras.aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_hh_otras = CotiServicios.objects.filter(num_reg=num_reg, cog__regex=r"^\d{3}6", nig=0).aggregate(total=Coalesce(Sum(F("tot")*F("can")), Decimal("0")))["total"] - costo_hh_otras

    # Costo servicios
    qs_servicios = CotiServicios.objects.filter(num_reg=num_reg, mov="05")
    costo_servicios = qs_servicios.filter(nig=2).aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_servicios = qs_servicios.filter(nig=1).aggregate(total=Coalesce(Sum("tot"), Decimal("0")))["total"] - costo_servicios

    # Gastos entrega
    qs_gastos_entrega = CotiServicios.objects.filter(num_reg=num_reg, mov="00", nig=2)
    costo_gastos_entrega = qs_gastos_entrega.aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_gastos_entrega = qs_gastos_entrega.aggregate(total=Coalesce(Sum("tot"), Decimal("0")))["total"] - costo_gastos_entrega

    # Imprevistos
    qs_imprevistos = CotiServicios.objects.filter(num_reg=num_reg, mov="06", nig=1)
    costo_imprevistos = qs_imprevistos.aggregate(costo=Coalesce(Sum("toc"), Decimal("0")))["costo"]
    ganancia_imprevistos = qs_imprevistos.aggregate(total=Coalesce(Sum("tot"), Decimal("0")))["total"] - costo_imprevistos

    # --------------------------
    # RESUMEN
    # --------------------------
    resumen = [
        {"concepto": "GASTOS", "importe": costo_equipos + costo_servicios},
        {"concepto": "GANANCIAS", "importe": ganancia_equipos + ganancia_materiales + ganancia_hh_propios +
                                         ganancia_hh_otras + ganancia_imprevistos + ganancia_gastos_entrega + ganancia_servicios},
        {"concepto": "HH PROPIOS", "importe": costo_hh_propios},
        {"concepto": "HH OTRAS AREAS", "importe": costo_hh_otras},
        {"concepto": "IMPREVISTOS", "importe": costo_imprevistos},
        {"concepto": "GASTOS ENTREGA", "importe": costo_gastos_entrega},
    ]

    total_final = sum(d["importe"] for d in resumen)

    context = {
        "num_reg": num_reg,
        "titulo": "RESUMEN DE COSTO UTILIDAD",
        "proyecto": num_reg,
        "resumen": resumen,
        "total_final": total_final,
    }

    return render(
        request,
        "reportes/reporte_resumen_cotizacion.html",  # Plantilla específica para este resumen
        context,
    )

##============##
## AÑO ACTUAL ##
##============##
@api_view(["GET"])
def anno_actual(request):
    try:
        cia = cont_cias.objects.get(cod="001")
        return Response({"anno": cia.anno})
    except cont_cias.DoesNotExist:
        return Response({"anno": timezone.now().year})


##===============##
## FUNCION TEXTO ##
##===============##
from bs4 import BeautifulSoup

def html_to_text(html):
    if not html:
        return ""

    soup = BeautifulSoup(html, "html.parser")

    # Reemplaza <li> por "- texto"
    for li in soup.find_all("li"):
        li.insert_before("- ")
        li.append("\n")

    # Convierte <p> en saltos de línea
    for p in soup.find_all("p"):
        p.append("\n")

    text = soup.get_text()
    return text.strip()