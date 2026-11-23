
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const login = document.getElementById("login");
const panel = document.getElementById("panel");
const recuperacion = document.getElementById("recuperacion");

const mensaje = document.getElementById("mensaje");
const mensajeRecuperacion = document.getElementById("mensajeRecuperacion");

const formRecuperacion = document.getElementById("formRecuperacion");

let recuperando = false;

function mostrar(seccion) {
    login.style.display = seccion === "login" ? "block" : "none";
    panel.style.display = seccion === "panel" ? "block" : "none";
    recuperacion.style.display =
        seccion === "recuperacion" ? "block" : "none";
}

// Ocultar los formularios mientras se comprueba el acceso
mostrar("");

async function verificarAcceso() {
    if (recuperando) {
        return;
    }

    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {
        mostrar("login");
        return;
    }

    const { data, error: permisoError } = await supabaseClient
        .from("administradores")
        .select("usuario_id")
        .eq("usuario_id", user.id)
        .maybeSingle();

   
if (permisoError || !data) {

    console.log("Error de permisos:", permisoError);
    console.log("Permiso encontrado:", data);

    mensaje.textContent = permisoError
        ? "Error al consultar permisos: " + permisoError.message
        : "La cuenta no aparece como administradora.";

    mostrar("login");
    return;
}


    mostrar("panel");
}

// Detectar una recuperación validada por Supabase
supabaseClient.auth.onAuthStateChange((evento) => {
    if (evento === "PASSWORD_RECOVERY") {
        recuperando = true;
        formRecuperacion.style.display = "block";
        mensajeRecuperacion.textContent = "";
        mostrar("recuperacion");
    }
});

// Iniciar sesión
document.getElementById("formLogin")
    .addEventListener("submit", async function(evento) {
        evento.preventDefault();

        mensaje.textContent = "Verificando...";

        const correo =
            document.getElementById("correo").value;

        const contrasena =
            document.getElementById("contrasena").value;

        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email: correo,
                password: contrasena
            });

        if (error) {
            mensaje.textContent =
                "No se pudo iniciar sesión. Revisa tus datos.";
            return;
        }

        mensaje.textContent = "";
        await verificarAcceso();
    });

// Guardar nueva contraseña
formRecuperacion.addEventListener(
    "submit",
    async function(evento) {
        evento.preventDefault();

        if (!recuperando) {
            mensajeRecuperacion.textContent =
                "Primero debes validar un enlace de recuperación.";
            return;
        }

        mensajeRecuperacion.textContent =
            "Comprobando sesión...";

        const { data: { user }, error: sesionError } =
            await supabaseClient.auth.getUser();

        if (sesionError || !user) {
            mensajeRecuperacion.textContent =
                "El enlace no tiene una sesión válida. Solicita uno nuevo.";
            return;
        }

        const nueva =
            document.getElementById("nuevaContrasena").value;

        mensajeRecuperacion.textContent = "Guardando...";

        const { error } =
            await supabaseClient.auth.updateUser({
                password: nueva
            });

        if (error) {
            mensajeRecuperacion.textContent = error.message;
            return;
        }

        await supabaseClient.auth.signOut();

        recuperando = false;

        window.history.replaceState(
            null,
            "",
            window.location.pathname
        );

        mostrar("login");

        mensaje.textContent =
            "Contraseña actualizada. Ya puedes iniciar sesión.";
    }
);

// Cerrar sesión
document.getElementById("salir")
    .addEventListener("click", async function() {
        await supabaseClient.auth.signOut();
        mostrar("login");
    });

// Comprobar cómo se abrió la página
async function iniciarPanel() {
    const hash = new URLSearchParams(
        window.location.hash.substring(1)
    );

    const parametros = new URLSearchParams(
        window.location.search
    );

    const esRecuperacion =
        hash.get("type") === "recovery" ||
        parametros.get("type") === "recovery";

    const tieneCodigo =
        parametros.has("code") ||
        parametros.has("token_hash");

    // Supabase procesa automáticamente los enlaces compatibles
    const { error: errorInicio } =
        await supabaseClient.auth.initialize();

    if (recuperando) {
        return;
    }

    if (esRecuperacion || tieneCodigo) {
        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (errorInicio || !session) {
            recuperando = true;
            formRecuperacion.style.display = "none";

            mensajeRecuperacion.textContent =
                "El enlace no se pudo validar o caducó. Solicita uno nuevo.";

            mostrar("recuperacion");
            return;
        }

        // Un enlace de recuperación debe generar
        // el evento PASSWORD_RECOVERY.
        // No mostrar el cambio de contraseña
        // por tener solamente una sesión normal.
        if (esRecuperacion) {
            recuperando = true;
            formRecuperacion.style.display = "block";
            mostrar("recuperacion");
            return;
        }

        await verificarAcceso();
        return;
    }

    await verificarAcceso();
}

iniciarPanel();

