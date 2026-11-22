
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const login = document.getElementById("login");
const panel = document.getElementById("panel");
const mensaje = document.getElementById("mensaje");

async function verificarAcceso() {
    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {
        login.style.display = "block";
        panel.style.display = "none";
        return;
    }

    const { data, error: permisoError } = await supabaseClient
        .from("administradores")
        .select("usuario_id")
        .eq("usuario_id", user.id)
        .maybeSingle();

    if (permisoError || !data) {
        await supabaseClient.auth.signOut();
        login.style.display = "block";
        panel.style.display = "none";
        mensaje.textContent = "No tienes permiso de administración.";
        return;
    }

    login.style.display = "none";
    panel.style.display = "block";
}

document.getElementById("formLogin")
    .addEventListener("submit", async function(evento) {
        evento.preventDefault();

        mensaje.textContent = "Verificando...";

        const correo = document.getElementById("correo").value;
        const contrasena = document.getElementById("contrasena").value;

        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email: correo,
                password: contrasena
            });

        if (error) {
            mensaje.textContent = "Correo o contraseña incorrectos.";
            return;
        }

        mensaje.textContent = "";
        await verificarAcceso();
    });

document.getElementById("salir")
    .addEventListener("click", async function() {
        await supabaseClient.auth.signOut();
        login.style.display = "block";
        panel.style.display = "none";
    });


        verificarAcceso();
    

const recuperacion = document.getElementById("recuperacion");
const mensajeRecuperacion =
    document.getElementById("mensajeRecuperacion");

let recuperando = false;

supabaseClient.auth.onAuthStateChange((evento) => {
    if (evento === "PASSWORD_RECOVERY") {
        recuperando = true;
        login.style.display = "none";
        panel.style.display = "none";
        recuperacion.style.display = "block";
    }
});

document.getElementById("formRecuperacion")
    .addEventListener("submit", async function(evento) {
        evento.preventDefault();

        const nueva = document.getElementById("nuevaContrasena").value;

        mensajeRecuperacion.textContent = "Guardando...";

        const { error } = await supabaseClient.auth.updateUser({
            password: nueva
        });

        if (error) {
            mensajeRecuperacion.textContent = error.message;
            return;
        }

        recuperando = false;
        await supabaseClient.auth.signOut();

        recuperacion.style.display = "none";
        login.style.display = "block";

        mensaje.textContent =
            "Contraseña actualizada. Ya puedes iniciar sesión.";
    });


async function iniciarPanel() {
    const hash = window.location.hash;

    if (
        hash.includes("type=recovery") ||
        hash.includes("type%3Drecovery")
    ) {
        recuperando = true;

        login.style.display = "none";
        panel.style.display = "none";
        recuperacion.style.display = "block";

        const { error } =
            await supabaseClient.auth.initialize();

        if (error) {
            mensajeRecuperacion.textContent =
                "No se pudo validar el enlace. Solicita uno nuevo.";
        }

        return;
    }

    await verificarAcceso();
}

iniciarPanel();
