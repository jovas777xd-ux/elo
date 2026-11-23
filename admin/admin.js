
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
    await cargarProductos();
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

async function cargarProductos() {
    const lista = document.getElementById("listaProductos");
    const mensaje = document.getElementById("mensajeProductos");

    mensaje.textContent = "Cargando productos...";
    lista.replaceChildren();

    const { data, error } = await supabaseClient
        .from("productos")
        .select("id, nombre, precio, categoria, activo")
        .order("id");

    if (error) {
        mensaje.textContent = "Error: " + error.message;
        return;
    }

    if (data.length === 0) {
        mensaje.textContent =
            "Todavía no hay productos registrados en Supabase.";
        return;
    }

    mensaje.textContent = data.length + " productos encontrados.";

   
data.forEach(function(producto) {
    const elemento = document.createElement("div");

    elemento.style.borderBottom = "1px solid #555";
    elemento.style.padding = "15px 0";

    const informacion = document.createElement("p");

    informacion.textContent =
        producto.nombre + " | $" +
        (producto.precio ?? "Sin precio") +
        " | " + (producto.categoria ?? "Sin categoría") +
        " | " + (producto.activo ? "Visible" : "Oculto");

    const botonEditar = document.createElement("button");
    botonEditar.textContent = "Editar";
    botonEditar.type = "button";

   

botonEditar.addEventListener("click", function() {
    document.getElementById("editarId").value =
        producto.id;

    document.getElementById("editarNombre").value =
        producto.nombre;

    document.getElementById("editarPrecio").value =
        producto.precio ?? "";

    document.getElementById("editarCategoria").value =
        producto.categoria ?? "";

    document.getElementById("mensajeEditar").textContent = "";

    document.getElementById("seccionEditar").style.display =
        "block";

    document.getElementById("seccionEditar")
        .scrollIntoView({ behavior: "smooth" });
});

   

    const botonEstado = document.createElement("button");
    botonEstado.type = "button";
    botonEstado.textContent = producto.activo
        ? "Ocultar"
        : "Mostrar";

    botonEstado.addEventListener("click", async function() {
        botonEstado.disabled = true;

        const { error } = await supabaseClient
            .from("productos")
            .update({ activo: !producto.activo })
            .eq("id", producto.id);

        if (error) {
            alert("Error: " + error.message);
            botonEstado.disabled = false;
            return;
        }

        await cargarProductos();
    });

    elemento.appendChild(informacion);
    elemento.appendChild(botonEditar);
    elemento.appendChild(botonEstado);

    lista.appendChild(elemento);
});

}

document.getElementById("actualizarProductos")
    .addEventListener("click", cargarProductos);


document.getElementById("formProducto")
    .addEventListener("submit", async function(evento) {
        evento.preventDefault();

        const nombre =
            document.getElementById("nombreProducto").value.trim();

        const precioTexto =
            document.getElementById("precioProducto").value;

        const categoria =
            document.getElementById("categoriaProducto").value.trim();

        const mensajeGuardar =
            document.getElementById("mensajeGuardar");

        mensajeGuardar.textContent = "Guardando...";

        const { error } = await supabaseClient
            .from("productos")
            .insert({
                nombre: nombre,
                precio: precioTexto === ""
                    ? null
                    : Number(precioTexto),
                categoria: categoria,
                activo: false
            });

        if (error) {
            mensajeGuardar.textContent =
                "Error: " + error.message;
            return;
        }

        mensajeGuardar.textContent =
            "Producto guardado correctamente.";

        evento.target.reset();
        await cargarProductos();
    });

iniciarPanel();

const formProducto = document.getElementById("formProducto");

if (formProducto) {
    formProducto.addEventListener("submit", async function(evento) {
        evento.preventDefault();

        const mensajeGuardar =
            document.getElementById("mensajeGuardar");

        const nombre =
            document.getElementById("nombreProducto").value.trim();

        const precio =
            document.getElementById("precioProducto").value;

        const categoria =
            document.getElementById("categoriaProducto").value.trim();

        mensajeGuardar.textContent = "Guardando producto...";

        const { error } = await supabaseClient
            .from("productos")
            .insert({
                nombre: nombre,
                precio: precio === "" ? null : Number(precio),
                categoria: categoria,
                activo: false
            });

        if (error) {
            mensajeGuardar.textContent =
                "Error: " + error.message;
            return;
        }

        mensajeGuardar.textContent =
            "Producto guardado correctamente.";

        formProducto.reset();
        await cargarProductos();
    });
}

document.getElementById("formEditar")
    .addEventListener("submit", async function(evento) {
        evento.preventDefault();

        const id = document.getElementById("editarId").value;
        const nombre =
            document.getElementById("editarNombre").value.trim();
        const precio =
            document.getElementById("editarPrecio").value;
        const categoria =
            document.getElementById("editarCategoria").value.trim();

        const mensajeEditar =
            document.getElementById("mensajeEditar");

        if (!nombre) {
            mensajeEditar.textContent =
                "El nombre es obligatorio.";
            return;
        }

        mensajeEditar.textContent = "Guardando cambios...";

        const { error } = await supabaseClient
            .from("productos")
            .update({
                nombre: nombre,
                precio: precio === "" ? null : Number(precio),
                categoria: categoria
            })
            .eq("id", id);

        if (error) {
            mensajeEditar.textContent =
                "Error: " + error.message;
            return;
        }

        mensajeEditar.textContent =
            "Cambios guardados correctamente.";

        await cargarProductos();
    });

document.getElementById("cancelarEdicion")
    .addEventListener("click", function() {
        document.getElementById("seccionEditar")
            .style.display = "none";
    });






