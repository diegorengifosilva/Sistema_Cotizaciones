from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from simple_history.models import HistoricalRecords
from django.contrib.auth.hashers import check_password, make_password
import datetime

#========================================================================================

##=========##
## USUARIO ##
##=========##
class VcTabAreas(models.Model):
    codigo = models.IntegerField(primary_key=True)
    nombre = models.CharField(max_length=150)
    responsable = models.CharField(max_length=150, blank=True, null=True)
    telefono = models.CharField(max_length=50, blank=True, null=True)
    correlativo = models.IntegerField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    std = models.IntegerField(blank=True, null=True)
    org = models.CharField(max_length=150, blank=True, null=True)
    nomp = models.CharField(max_length=150, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "vc_tab_areas"

    def __str__(self):
        return self.nombre

    def get_nombre(self):
        return self.nombre

class VcTabBancos(models.Model):
    codigo = models.CharField(max_length=5, primary_key=True)
    nombre = models.CharField(max_length=150)
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "vc_tab_bancos"

    def __str__(self):
        return self.nombre

    def get_nombre(self):
        return self.nombre

class VcTabCargos(models.Model):
    codigo = models.CharField(max_length=5, primary_key=True)
    nombre = models.CharField(max_length=150, blank=True, null=True)
    nom = models.CharField(max_length=150, blank=True, null=True)
    niv = models.PositiveIntegerField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "vc_tab_cargos"

    def __str__(self):
        return self.nombre if self.nombre else f"Código {self.codigo}"

    def get_nombre(self):
        return self.nombre if self.nombre else ""

class SegUsuario(models.Model):
    usuario_usu = models.CharField(max_length=150, primary_key=True)
    password_usu = models.CharField(max_length=255)
    nomb_cort_usu = models.CharField(max_length=150, blank=True, null=True)
    nom = models.CharField(max_length=50, blank=True, null=True)
    ape = models.CharField(max_length=50, blank=True, null=True)
    area = models.IntegerField(blank=True, null=True)
    cargo = models.CharField(max_length=5, blank=True, null=True)  # Código cargo
    ban = models.CharField(max_length=5, blank=True, null=True)    # Código banco
    banc = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "seg_usuarios"

    # ==============================
    # Compatibilidad con Django / SimpleJWT
    # ==============================
    USERNAME_FIELD = "usuario_usu"  # Necesario para DRF y SimpleJWT
    REQUIRED_FIELDS = []  # No necesitamos más campos obligatorios

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return True

    def get_username(self):
        return self.usuario_usu

    @property
    def password(self):
        """Alias para compatibilidad con Django"""
        return self.password_usu

    def set_password(self, raw_password):
        """Permite crear contraseñas compatibles con Django"""
        self.password_usu = make_password(raw_password)

    def check_password(self, raw_password):
        """Verifica la contraseña usando el hash de Django"""
        return check_password(raw_password, self.password_usu)

    def __str__(self):
        return f"{self.nomb_cort_usu or self.usuario_usu}"

    # ==============================
    # Métodos de relaciones
    # ==============================
    def get_area_nombre(self):
        from cotizaciones_api.models import VcTabAreas
        try:
            return VcTabAreas.objects.get(codigo=self.area).get_nombre()
        except VcTabAreas.DoesNotExist:
            return ""

    def get_cargo_nombre(self):
        from cotizaciones_api.models import VcTabCargos
        try:
            return VcTabCargos.objects.get(codigo=self.cargo).get_nombre()
        except VcTabCargos.DoesNotExist:
            return ""

    def get_banco_nombre(self):
        from cotizaciones_api.models import VcTabBancos
        try:
            return VcTabBancos.objects.get(codigo=self.ban).get_nombre()
        except VcTabBancos.DoesNotExist:
            return ""

#========================================================================================

##============================##
## APROBACIÓN DE COTIZACIONES ##
##============================##
class DashboardCotizacion(models.Model):
    # ── DATOS PRINCIPALES ─────────────────────────────
    numero = models.CharField(max_length=70, db_column="cotin", blank=True, null=True)
    fecha = models.DateField(db_column="cotif", db_index=True, default=timezone.now)
    referencia = models.CharField(max_length=150, blank=True, null=True, db_column="refer")
    num_reg = models.AutoField(primary_key=True, db_column="num_reg")

    # ── CLIENTE ─────────────────────────────
    cliente_codigo = models.CharField(max_length=5, blank=True, null=True, db_column="empre")
    nombr = models.CharField(max_length=70, blank=True, null=True, db_column="nombr")
    cargr = models.CharField(max_length=70, blank=True, null=True, db_column="cargr")
    codir = models.CharField(max_length=5, blank=True, null=True, db_column="codir")
    teler = models.CharField(max_length=50, blank=True, null=True, db_column="teler")
    movir = models.CharField(max_length=50, blank=True, null=True, db_column="movir")
    mailr = models.CharField(max_length=50, blank=True, null=True, db_column="mailr")
    prob = models.CharField(max_length=1, blank=True, null=True, db_column="prob")
    cotit = models.CharField(max_length=1, blank=True, null=True, db_column="cotit")

    # ── ÁREA ─────────────────────────────
    area_codigo = models.CharField(max_length=1, blank=True, null=True, db_column="area")

    # ── ESTADO ─────────────────────────────
    estado_codigo = models.CharField(max_length=1, blank=True, null=True, db_column="estad")

    # ── ENVÍO ─────────────────────────────
    envio = models.IntegerField(blank=True, null=True, db_column="envio")

    # ── IMPORTE ─────────────────────────────
    tot_c = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, db_column="tot_c")

    # ── PAGO / ENTREGA / MONEDA ─────────────
    fpago = models.CharField(max_length=50, blank=True, null=True, db_column="fpago")
    lugar = models.CharField(max_length=100, blank=True, null=True, db_column="lugar")
    entrp = models.IntegerField(blank=True, null=True, db_column="entrp")
    entrf = models.CharField(max_length=50, blank=True, null=True, db_column="entrf")
    tmone = models.CharField(max_length=20, blank=True, null=True, db_column="tmone")
    tcamb = models.DecimalField(max_digits=7, decimal_places=3, blank=True, null=True)
    igv = models.CharField(max_length=1, blank=True, null=True, db_column="igv")

    # ── ENTREGA SUMINISTROS ─────────────
    plazo = models.IntegerField(blank=True, null=True, db_column="plazo")      # antes era CharField, DB es int(3)
    tot_d = models.CharField(max_length=1, blank=True, null=True, db_column="tot_d")  # varchar(1)

    # ── ENTREGA SERVICIOS ─────────────
    por_c = models.IntegerField(blank=True, null=True, db_column="por_c")      # int(3)
    tot_s = models.CharField(max_length=1, blank=True, null=True, db_column="tot_s")  # varchar(1)

    # ── VALIDEZ OFERTA ─────────────
    valid = models.IntegerField(blank=True, null=True, db_column="valid")      # int(3)
    acu_s = models.CharField(max_length=1, blank=True, null=True, db_column="acu_s")  # varchar(1)

    # ── CONTACTOS ─────────────────────────────
    # Comercial
    nombc = models.CharField(max_length=150, blank=True, null=True, db_column="nombc")
    telec = models.CharField(max_length=20, blank=True, null=True, db_column="telec")
    mov1c = models.CharField(max_length=20, blank=True, null=True, db_column="mov1c")
    mov2c = models.CharField(max_length=20, blank=True, null=True, db_column="mov2c")
    mov3c = models.CharField(max_length=20, blank=True, null=True, db_column="mov3c")
    mailc = models.CharField(max_length=100, blank=True, null=True, db_column="mailc")

    # Técnico
    nombt = models.CharField(max_length=150, blank=True, null=True, db_column="nombt")
    telet = models.CharField(max_length=20, blank=True, null=True, db_column="telet")
    mov1t = models.CharField(max_length=20, blank=True, null=True, db_column="mov1t")
    mov2t = models.CharField(max_length=20, blank=True, null=True, db_column="mov2t")
    mov3t = models.CharField(max_length=20, blank=True, null=True, db_column="mov3t")
    mailt = models.CharField(max_length=100, blank=True, null=True, db_column="mailt")

    # ── ADICIONALES ─────────────────────────────
    acu_e = models.TextField(blank=True, null=True)
    sald = models.DecimalField(max_digits=11, decimal_places=2, blank=True, null=True, db_column="sald")
    anno = models.CharField(max_length=4, blank=True, null=True, db_column="anno")
    mes = models.CharField(max_length=2, blank=True, null=True, db_column="mes")
    regus = models.CharField(max_length=200, blank=True, null=True, db_column="regus")

    # ── DESCUENTOS ─────────────────────────────
    des_a = models.CharField(max_length=1, blank=True, null=True, db_column="des_a")
    des_t = models.CharField(max_length=1, blank=True, null=True, db_column="des_t")
    des_m = models.DecimalField(max_digits=11, decimal_places=2, blank=True, null=True, db_column="des_m")
    des_p = models.DecimalField(max_digits=11, decimal_places=2, blank=True, null=True, db_column="des_p")

    # ── PROPIEDADES DERIVADAS ─────────────────────────────
    @property
    def cliente_nombre(self):
        try:
            from cotizaciones_api.models import vc_tab_clientes_d
            if not self.cliente_codigo:
                return self.nombr or ""
            cliente = vc_tab_clientes_d.objects.get(codigo=self.cliente_codigo)
            return cliente.representante or self.nombr or ""
        except Exception:
            return self.nombr or ""

    @property
    def prob_nombre(self):
        mapping = {"0": "Baja", "1": "Media", "2": "Alta", "3": "Muy Alta"}
        return mapping.get(self.prob, "")

    @property
    def tipo_nombre(self):
        mapping = {"P": "Proyecto", "S": "Servicio", "V": "Venta"}
        return mapping.get(self.cotit, "")

    @property
    def area_nombre(self):
        mapping = {"1": "Industria", "2": "Mineria", "3": "Mantenimiento",
                   "4": "Petroquimica", "8": "Seguridad de Maquinaria"}
        return mapping.get(self.area_codigo, "")

    @property
    def estado_nombre(self):
        mapping = {"1": "Adjudicado", "2": "Pendiente", "3": "Perdida", "4": "Anulado",
                   "5": "Postergada", "6": "En Seguimiento"}
        return mapping.get(self.estado_codigo, "")

    @property
    def moneda_nombre(self):
        mapping = {"S": "Soles", "D": "Dólares"}
        return mapping.get(self.tmone, "")

    @property
    def unidad_suministro_nombre(self):
        mapping = {"D": "Dias", "S": "Semanas", "M": "Meses"}
        return mapping.get(self.tot_d, "")

    @property
    def unidad_servicio_nombre(self):
        mapping = {"D": "Dias", "S": "Semanas", "M": "Meses"}
        return mapping.get(self.tot_s, "")

    @property
    def unidad_validez_nombre(self):
        mapping = {"D": "Dias", "S": "Semanas", "M": "Meses"}
        return mapping.get(self.acu_s, "")

    @property
    def igv_nombre(self):
        mapping = {
            "S": "Incluye",
            "N": "No Incluye",
        }
        return mapping.get(self.igv, "")

    class Meta:
        managed = False
        db_table = "vc_mov_cotizaciones"
        verbose_name = "Cotización Dashboard"
        verbose_name_plural = "Cotizaciones Dashboard"
        ordering = ["-fecha", "-numero", ]

    def __str__(self):
        return f"Cotización #{self.numero} | {self.cliente_nombre} | {self.estado_nombre}"

class CotiSuministros(models.Model):
    num_reg = models.IntegerField(blank=True, null=True)
    cog = models.CharField(max_length=5, blank=True, null=True)
    nog = models.CharField(max_length=200, blank=True, null=True)
    nig = models.IntegerField(blank=True, null=True)
    num = models.IntegerField(primary_key=True)
    cod = models.CharField(max_length=60, blank=True, null=True)
    des = models.CharField(max_length=5000, blank=True, null=True)
    pro = models.CharField(max_length=50, blank=True, null=True)
    can = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    puc = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    toc = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    cau = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tou = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    val = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tot = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    mov = models.CharField(max_length=2, blank=True, null=True)
    tpr = models.CharField(max_length=2, blank=True, null=True)
    tde = models.CharField(max_length=50, blank=True, null=True)
    tog = models.CharField(max_length=1, blank=True, null=True)

    class Meta:
        # Define el nombre de la tabla existente en la base de datos
        db_table = 'vc_mov_cotizaciones_su'
        # Indica a Django que esta tabla ya existe y no debe generar migraciones para ella
        managed = False 

    def __str__(self):
        # Método opcional para una representación legible del objeto
        return f"Registro {self.num_reg} - Código {self.cod}"

class CotiServicios(models.Model):
    num_reg = models.IntegerField(blank=True, null=True)
    cog = models.CharField(max_length=5, blank=True, null=True)
    nog = models.CharField(max_length=200, blank=True, null=True)
    nig = models.IntegerField(blank=True, null=True)

    # Mantenemos num como PK igual que suministros
    num = models.IntegerField(primary_key=True)

    cod = models.CharField(max_length=60, blank=True, null=True)
    des = models.CharField(max_length=100, blank=True, null=True)
    pro = models.CharField(max_length=50, blank=True, null=True)

    can = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    puc = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    toc = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    cau = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tou = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    val = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tot = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    mov = models.CharField(max_length=2, blank=True, null=True)
    tpr = models.CharField(max_length=1, blank=True, null=True)

    # En servicios tde es DECIMAL según la BD real
    tde = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # tog es longtext → TextField
    tog = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'vc_mov_cotizaciones_mo'
        managed = False

    def __str__(self):
        return f"Servicio {self.num_reg} - Código {self.cod}"

class CotiMensajes(models.Model):
    num_reg = models.CharField(max_length=70)
    dat = models.DateTimeField(auto_now_add=True, primary_key=True)  # usamos dat como PK
    cod = models.CharField(max_length=20)
    msj = models.CharField(max_length=500)
    act = models.CharField(max_length=1, default="1")

    class Meta:
        db_table = "vc_mov_cotizaciones_msj"
        ordering = ["-dat"]
        managed = False  # Django no creará ni modificará la tabla

    def __str__(self):
        return f"{self.num_reg} - {self.cod}"
    
class CotiSeguimiento(models.Model):
    dat = models.DateTimeField(primary_key=True)
    num_reg = models.IntegerField()
    num = models.IntegerField()
    fec = models.CharField(max_length=25)  # 🔥 CAMBIO CLAVE
    hor = models.CharField(max_length=10)
    des = models.CharField(max_length=700)
    cod = models.CharField(max_length=30)
    act = models.CharField(max_length=1, default="1")

    class Meta:
        db_table = "vc_mov_cotizaciones_vi"
        managed = False
        ordering = ["-dat"]

    def __str__(self):
        return f"{self.num_reg} - {self.cod}"

#========================================================================================

##=============================##
## SEGUIMIENTO DE COTIZACIONES ##
##=============================##

#========================================================================================

##================##
## DATOS DE BD_VC ##
##================##
# vc_tab_areas
class vc_tab_areas(models.Model):
    codigo = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    responsable = models.CharField(max_length=150, null=True, blank=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    correlativo = models.CharField(max_length=10, null=True, blank=True)
    activo = models.BooleanField(default=True)
    std = models.IntegerField(null=True, blank=True)
    org = models.CharField(max_length=100, null=True, blank=True)
    nomp = models.CharField(max_length=150, null=True, blank=True)

    class Meta:
        managed = False  # Django no creará ni modificará esta tabla
        db_table = "vc_tab_areas"
        verbose_name = "Área"
        verbose_name_plural = "Áreas"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre}"

# vc_tab_clientes
class vc_tab_clientes(models.Model):
    codigo = models.CharField(max_length=20, primary_key=True)
    nombre = models.CharField(max_length=150)
    iniciales = models.CharField(max_length=50, blank=True, null=True)
    ruc = models.CharField(max_length=20, blank=True, null=True)

    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "vc_tab_clientes"

    def __str__(self):
        return self.nombre

# vc_tab_clientes_d
class vc_tab_clientes_d(models.Model):
    codigo = models.CharField(max_length=20, primary_key=True)  # Código del cliente o registro
    representante = models.CharField(max_length=150, blank=True, null=True)
    cargo = models.CharField(max_length=100, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    movil = models.CharField(max_length=20, blank=True, null=True)
    email = models.CharField(max_length=100, blank=True, null=True)
    empresa = models.CharField(max_length=150, blank=True, null=True)
    direccion = models.CharField(max_length=150, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo

    class Meta:
        managed = False
        db_table = "vc_tab_clientes_d"
        ordering = ["representante"]

    def __str__(self):
        return f"{self.representante} ({self.empresa})"
    
# vc_tab_estado
class vc_tab_estado(models.Model):
    codigo = models.CharField(max_length=5, primary_key=True)
    nombre = models.CharField(max_length=100)
    cot = models.CharField(max_length=1)
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "vc_tab_estado"

    def __str__(self):
        return self.nombre

# vc_tab_tipo
class vc_tab_tipo(models.Model):
    codigo = models.CharField(max_length=10, primary_key=True, verbose_name="Código")
    nombre = models.CharField(max_length=100, verbose_name="Nombre")
    activo = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        db_table = 'vc_tab_tipo'
        verbose_name = 'Tipo'
        verbose_name_plural = 'Tipos'

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

# vc_mov_cotizaciones
class vc_mov_cotizaciones(models.Model):
    # Datos principales
    num_reg = models.IntegerField(blank=True, null=True)
    anno = models.IntegerField(default=timezone.now().year)
    mes = models.IntegerField(blank=True, null=True)
    cotin = models.IntegerField(primary_key=True)
    cotit = models.CharField(max_length=50, blank=True, null=True)
    cotif = models.DateField(blank=True, null=True)
    refer = models.CharField(max_length=150, blank=True, null=True)
    empre = models.CharField(max_length=20, blank=True, null=True)
    codir = models.CharField(max_length=10, blank=True, null=True)
    nombr = models.CharField(max_length=150, blank=True, null=True)
    cargr = models.CharField(max_length=50, blank=True, null=True)
    teler = models.CharField(max_length=20, blank=True, null=True)
    movir = models.CharField(max_length=20, blank=True, null=True)
    mailr = models.CharField(max_length=100, blank=True, null=True)
    
    # Contacto Comercial
    codic = models.CharField(max_length=10, blank=True, null=True)
    nombc = models.CharField(max_length=150, blank=True, null=True)
    telec = models.CharField(max_length=20, blank=True, null=True)
    mov1c = models.CharField(max_length=20, blank=True, null=True)
    mov2c = models.CharField(max_length=20, blank=True, null=True)
    mov3c = models.CharField(max_length=20, blank=True, null=True)
    mailc = models.CharField(max_length=100, blank=True, null=True)
    
    # Contacto Técnico
    codit = models.CharField(max_length=10, blank=True, null=True)
    nombt = models.CharField(max_length=150, blank=True, null=True)
    telet = models.CharField(max_length=20, blank=True, null=True)
    mov1t = models.CharField(max_length=20, blank=True, null=True)
    mov2t = models.CharField(max_length=20, blank=True, null=True)
    mov3t = models.CharField(max_length=20, blank=True, null=True)
    mailt = models.CharField(max_length=100, blank=True, null=True)

    # Pago / Entrega / Moneda
    fpago = models.CharField(max_length=50, blank=True, null=True)
    lugar = models.CharField(max_length=100, blank=True, null=True)
    plazo = models.CharField(max_length=50, blank=True, null=True)
    tmone = models.CharField(max_length=20, blank=True, null=True)
    igv = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    valid = models.IntegerField(blank=True, null=True)
    
    # Otros
    por_c = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    acu_e = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    acu_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tot_c = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tot_d = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tot_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    estad = models.CharField(max_length=5, blank=True, null=True)
    ocomn = models.CharField(max_length=50, blank=True, null=True)
    ocomf = models.CharField(max_length=50, blank=True, null=True)
    area = models.CharField(max_length=10, blank=True, null=True)
    entrp = models.IntegerField(blank=True, null=True)
    entrf = models.CharField(max_length=50, blank=True, null=True)
    regus = models.CharField(max_length=50, blank=True, null=True)
    fecus = models.DateField(blank=True, null=True)
    envio = models.CharField(max_length=50, blank=True, null=True)
    tcamb = models.DecimalField(max_digits=10, decimal_places=3, blank=True, null=True)
    sald = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    des_a = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    des_t = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    des_m = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    des_p = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    anno_a = models.IntegerField(blank=True, null=True)
    msj = models.CharField(max_length=255, blank=True, null=True)
    seg = models.CharField(max_length=50, blank=True, null=True)
    prob = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "vc_mov_cotizaciones"
        ordering = ["-cotif"]

    # ─── Propiedades derivadas ───────────────────────
    @property
    def cliente_nombre(self):
        try:
            from cotizaciones_api.models import vc_tab_clientes_d
            if not self.empre:
                return self.nombr or ""
            cliente = vc_tab_clientes_d.objects.get(codigo=self.empre)
            return cliente.representante or self.nombr or ""
        except vc_tab_clientes_d.DoesNotExist:
            return self.nombr or ""
        except Exception:
            return self.nombr or ""
    
    @property
    def area_nombre(self):
        try:
            from cotizaciones_api.models import vc_tab_areas
            if not self.area:
                return ""
            area_obj = vc_tab_areas.objects.get(codigo=self.area)
            return area_obj.nombre
        except Exception:
            return ""

    @property
    def estado_nombre(self):
        try:
            from cotizaciones_api.models import vc_tab_estado
            if not self.estad:
                return ""
            estado_obj = vc_tab_estado.objects.get(codigo=self.estad)
            return estado_obj.nombre
        except Exception:
            return ""

    @property
    def tipo_nombre(self):
        """
        Devuelve el nombre del tipo (Servicio / Proyecto / Venta)
        según el código cotit y la tabla vc_tab_tipo.
        """
        try:
            from cotizaciones_api.models import vc_tab_tipo
            if not self.cotit:
                return ""
            tipo_obj = vc_tab_tipo.objects.get(codigo=self.cotit)
            return tipo_obj.nombre
        except vc_tab_tipo.DoesNotExist:
            return ""
        except Exception:
            return ""

    @property
    def mes(self):
        if self.cotif:
            return self.cotif.month
        return None

# vc_tab_tproveedor
class vc_tab_tproveedor(models.Model):
    codigo = models.CharField(max_length=2, primary_key=True)
    nombre = models.CharField(max_length=50, blank=True, null=True)
    activo = models.CharField(max_length=1, blank=True, null=True)

    class Meta:
        db_table = "vc_tab_tproveedor"
        managed = False  # 👈 importante si la tabla ya existe en la DB

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

# vc_tab_categorias
class vc_tab_categorias(models.Model):
    codigo = models.CharField("Código", max_length=4, primary_key=True)
    nombre = models.CharField("Nombre", max_length=70, blank=True, null=True)
    cos_min = models.DecimalField("Costo Min", max_digits=10, decimal_places=2)
    cos_max = models.DecimalField("Costo Max", max_digits=10, decimal_places=2)
    cod_area = models.CharField("Código Área", max_length=1, blank=True, null=True)
    activo = models.CharField("Activo", max_length=1) 

    class Meta:
        db_table = "vc_tab_categorias"
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
    
# vc_tab_tgastos
class vc_tab_tgastos(models.Model):
    codigo = models.CharField("Código", max_length=2, primary_key=True)
    nombre = models.CharField("Nombre", max_length=50, blank=True, null=True)
    activo = models.CharField("Activo", max_length=1) 
    concepto = models.CharField("Concepto", max_length=1) 

    class Meta:
        db_table = "vc_tab_tgastos"
        verbose_name = "Tipo Gasto"
        verbose_name_plural = "Tipo Gasto"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

# vc_tab_tgastos_d
class vc_tab_tgastos_d(models.Model):
    codigo = models.CharField("Código", max_length=5, primary_key=True)
    nombre = models.CharField("Nombre", max_length=100, blank=True, null=True)
    unimed = models.CharField("Unimed", max_length=5, blank=True, null=True)
    importe = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    cod_tipo = models.CharField("Cod_Tipo", max_length=2, blank=True, null=True)
    activo = models.CharField("Activo", max_length=1) 
    cantidad = models.IntegerField(max_length=10) 

    class Meta:
        db_table = "vc_tab_tgastos_d"
        verbose_name = "Tipo Gasto D"
        verbose_name_plural = "Tipo Gasto D"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

# seg_usuarios
class seg_usuario(models.Model):
    usuario_usu = models.CharField(max_length=150, primary_key=True)
    nomb_cort_usu = models.CharField(max_length=150, blank=True, null=True)
    nom = models.CharField(max_length=50, blank=True, null=True)
    ape = models.CharField(max_length=50, blank=True, null=True)
    area = models.IntegerField(blank=True, null=True)
    cargo = models.CharField(max_length=5, blank=True, null=True)
    dni = models.CharField(max_length=15, blank=True, null=True)

    # Bancos
    ban = models.CharField(max_length=5, blank=True, null=True)
    banc = models.CharField(max_length=50, blank=True, null=True)

    # Contactos - Técnico
    telefono = models.CharField(max_length=50, blank=True, null=True)
    movil1 = models.CharField(max_length=50, blank=True, null=True)
    movil2 = models.CharField(max_length=50, blank=True, null=True)
    movil3 = models.CharField(max_length=50, blank=True, null=True)
    email_usu = models.CharField(max_length=100, blank=True, null=True)

    activo = models.CharField(max_length=1, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "seg_usuarios"

    def __str__(self):
        return self.nomb_cort_usu or self.usuario_usu

# cont_cias
class cont_cias(models.Model):
    cod = models.CharField(primary_key=True, max_length=10)  # clave primaria real (ej. "001")
    anno = models.IntegerField(default=timezone.now().year)

    class Meta:
        db_table = "cont_cias"
        managed = False

# vc_tab_rittal
class vc_tab_rittal(models.Model):
    codigo = models.CharField(max_length=10, primary_key=True)  # Código del cliente o registro
    nombre = models.CharField(max_length=100, blank=True, null=True)
    grupo = models.CharField(max_length=5, blank=True, null=True)
    um = models.CharField(max_length=10, blank=True, null=True)
    descripcion = models.CharField(max_length=100, blank=True, null=True)
    precio_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    precio_d = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    cantidad = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    ocodigo = models.CharField(max_length=15, blank=True, null=True)
    stock_min = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    stock_max = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    descuento = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=70, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo

    class Meta:
        managed = False
        db_table = "vc_tab_rittal"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.nombre})"

# vc_tab_rockwell
class vc_tab_rockwell(models.Model):
    codigo = models.CharField(max_length=60, primary_key=True)  # Código del cliente o registro
    codigo2 = models.CharField(max_length=60, blank=True, null=True)
    descripcion = models.CharField(max_length=100, blank=True, null=True)
    ds = models.CharField(max_length=2, blank=True, null=True)
    pgc = models.CharField(max_length=3, blank=True, null=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=20, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo
    cprimario = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    x = models.CharField(max_length=1, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "vc_tab_rockwell"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.codigo2})"

# vc_tab_ceyesa
class vc_tab_ceyesa(models.Model):
    codigo = models.CharField(max_length=60, primary_key=True)  # Código del cliente o registro
    codigo2 = models.CharField(max_length=60, blank=True, null=True)
    descripcion = models.CharField(max_length=150, blank=True, null=True)
    ds = models.CharField(max_length=2, blank=True, null=True)
    pgc = models.CharField(max_length=3, blank=True, null=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=20, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo
    cprimario = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "vc_tab_ceyesa"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.codigo2})"

# vc_tab_hoffman
class vc_tab_hoffman(models.Model):
    codigo = models.CharField(max_length=10, primary_key=True)  # Código del cliente o registro
    nombre = models.CharField(max_length=100, blank=True, null=True)
    grupo = models.CharField(max_length=5, blank=True, null=True)
    um = models.CharField(max_length=10, blank=True, null=True)
    descripcion = models.CharField(max_length=100, blank=True, null=True)
    precio_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    precio_d = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    cantidad = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    ocodigo = models.CharField(max_length=15, blank=True, null=True)
    stock_min = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    stock_max = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    descuento = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=70, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo

    class Meta:
        managed = False
        db_table = "vc_tab_hoffman"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.nombre})"

# alm_articulos
class alm_articulos(models.Model):
    codigo = models.CharField(max_length=30, primary_key=True)  # Código del cliente o registro
    nombre = models.CharField(max_length=200, blank=True, null=True)
    grupo = models.CharField(max_length=5, blank=True, null=True)
    um = models.CharField(max_length=10, blank=True, null=True)
    descripcion = models.CharField(max_length=100, blank=True, null=True)
    precio_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    precio_d = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    cantidad = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    ocodigo = models.CharField(max_length=15, blank=True, null=True)
    stock_min = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    stock_max = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    descuento = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=70, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo

    class Meta:
        managed = False
        db_table = "alm_articulos"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.nombre})"

