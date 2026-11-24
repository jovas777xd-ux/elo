
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
    document.getElementById("contadorBusqueda").textContent = "";

    const { data, error } = await supabaseClient
        .from("productos")
   .select("id, nombre, precio, categoria, activo, imagen")
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
    elemento.className = "producto-fila";

    // Permite buscar por nombre, categoría y número de producto.
    elemento.dataset.busqueda = normalizarBusquedaAdmin(
        [producto.nombre, producto.categoria, producto.id].join(" ")
    );

    const informacion = document.createElement("div");
    informacion.className = "producto-detalles";

    const nombre = document.createElement("strong");
    nombre.className = "producto-nombre";
    nombre.textContent = producto.nombre;

    const detalles = document.createElement("p");
    detalles.className = "producto-meta";
    const categoria = producto.categoria === "baterias"
        ? "Baterías" : producto.categoria === "jugueteria"
        ? "Juguetería" : (producto.categoria || "Sin categoría");
    detalles.textContent = "ID " + producto.id + " · " + categoria;

    const precio = document.createElement("div");
    precio.className = "producto-precio";
    precio.textContent = producto.precio == null
        ? "Por cotizar"
        : new Intl.NumberFormat("es-MX", {
            style: "currency", currency: "MXN"
        }).format(Number(producto.precio));

    const estado = document.createElement("span");
    estado.className = "producto-estado " +
        (producto.activo ? "visible" : "oculto");
    estado.textContent = producto.activo ? "Visible" : "Oculto";

    informacion.append(nombre, detalles, precio, estado);

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
document.getElementById("editarImagen").value = "";
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

// Miniatura a la izquierda de cada producto.
const marco = document.createElement("div");
marco.className = "producto-imagen-caja";
if (producto.imagen) {
    const foto = document.createElement("img");
    foto.className = "producto-imagen";
    foto.src = producto.imagen;
    foto.alt = producto.nombre;
    foto.loading = "lazy";
    foto.addEventListener("error", function() {
        marco.textContent = "Sin foto";
    }, { once: true });
    marco.appendChild(foto);
} else {
    marco.textContent = "Sin foto";
}
elemento.append(marco, informacion);

const acciones = document.createElement("div");
acciones.className = "producto-acciones";
acciones.append(botonEditar, botonEstado);

    // Permitir borrar permanentemente solo despues de ocultar el producto.
    // El usuario debe confirmar escribiendo el nombre exacto.
    if (!producto.activo) {
        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.textContent = "Eliminar definitivamente";
        botonEliminar.className = "accion-eliminar";

        botonEliminar.addEventListener("click", async function() {
            const confirmacion = prompt(
                'Para eliminar definitivamente "' + producto.nombre +
                '", escribe su nombre exacto. Esta accion no se puede deshacer:'
            );

            if (confirmacion === null) return;

            if (confirmacion.trim() !== producto.nombre.trim()) {
                alert("El nombre no coincide. No se elimino el producto.");
                return;
            }

            botonEliminar.disabled = true;

            try {
                const { data, error } = await supabaseClient
                    .from("productos")
                    .delete()
                    .eq("id", producto.id)
                    .eq("activo", false)
                    .select("id");

                if (error) throw new Error(error.message);

                if (!data || data.length !== 1) {
                    throw new Error(
                        "No se elimino el producto. Puede que ya este visible " +
                        "o que no tengas permiso."
                    );
                }

                const editarId = document.getElementById("editarId");
                if (editarId && String(editarId.value) === String(producto.id)) {
                    document.getElementById("seccionEditar").style.display = "none";
                }

                await cargarProductos();
                alert("Producto eliminado correctamente.");
            } catch (error) {
                alert("No se pudo eliminar: " + error.message);
                botonEliminar.disabled = false;
            }
        });

        acciones.appendChild(botonEliminar);
    }

    elemento.appendChild(acciones);
    lista.appendChild(elemento);
});

    aplicarBusquedaAdmin();
}

function normalizarBusquedaAdmin(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es")
        .trim();
}

function aplicarBusquedaAdmin() {
    const lista = document.getElementById("listaProductos");
    const consulta = normalizarBusquedaAdmin(
        document.getElementById("buscarProductoAdmin").value
    );
    let visibles = 0;

    Array.from(lista.children).forEach(function(elemento) {
        const coincide = elemento.dataset.busqueda.includes(consulta);
        elemento.hidden = !coincide;
        if (coincide) visibles++;
    });

    const total = lista.children.length;
    const contador = document.getElementById("contadorBusqueda");
    contador.textContent = consulta
        ? "Encontrados " + visibles + " de " + total + " productos."
        : "Mostrando " + total + " productos.";
}

document.getElementById("buscarProductoAdmin")
    .addEventListener("input", aplicarBusquedaAdmin);

document.getElementById("actualizarProductos")
    .addEventListener("click", cargarProductos);

iniciarPanel();


const formProducto = document.getElementById("formProducto");

if (formProducto) {
    formProducto.addEventListener("submit", async function(evento) {
        evento.preventDefault();

        const boton = formProducto.querySelector(
            'button[type="submit"]'
        );

        if (boton.disabled) return;

        const mensaje = document.getElementById("mensajeGuardar");

        const nombre = document.getElementById("nombreProducto")
            .value.trim();

        const precio = document.getElementById("precioProducto").value;

        const categoria = document.getElementById("categoriaProducto")
            .value.trim();

        const archivo = document.getElementById("imagenProducto")
            .files[0];

        const tiposPermitidos = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };

        if (!nombre) {
            mensaje.textContent = "Escribe un nombre.";
            return;
        }

        if (archivo) {
            if (!tiposPermitidos[archivo.type]) {
                mensaje.textContent =
                    "Solo se permiten imágenes JPG, PNG o WEBP.";
                return;
            }

            if (archivo.size > 5 * 1024 * 1024) {
                mensaje.textContent =
                    "La fotografía no debe superar 5 MB.";
                return;
            }
        }

        boton.disabled = true;
        let rutaImagen = null;
        let urlImagen = null;

        try {
            if (archivo) {
                mensaje.textContent = "Subiendo fotografía...";

                const extension = tiposPermitidos[archivo.type];

                rutaImagen =
                    "catalogo/" + crypto.randomUUID() + "." + extension;

                const { error: errorImagen } = await supabaseClient
                    .storage
                    .from("productos")
                    .upload(rutaImagen, archivo, {
                        contentType: archivo.type,
                        upsert: false
                    });

                if (errorImagen) {
                    rutaImagen = null;
                    throw new Error(errorImagen.message);
                }

                const { data } = supabaseClient
                    .storage
                    .from("productos")
                    .getPublicUrl(rutaImagen);

                urlImagen = data.publicUrl;
            }

            mensaje.textContent = "Guardando producto...";

            const { error } = await supabaseClient
                .from("productos")
                .insert({
                    nombre: nombre,
                    precio: precio === "" ? null : Number(precio),
                    categoria: categoria,
                    imagen: urlImagen,
                    activo: false
                });

            if (error) {
                if (rutaImagen) {
                    await supabaseClient.storage
                        .from("productos")
                        .remove([rutaImagen]);
                }

                throw new Error(error.message);
            }

            mensaje.textContent =
                "¡Producto y fotografía guardados correctamente!";

            const vista = document.getElementById("vistaImagen");

            if (vista) {
                vista.replaceChildren();

                if (urlImagen) {
                    const imagen = document.createElement("img");
                    imagen.src = urlImagen;
                    imagen.alt = "Fotografía guardada";
                    imagen.style.maxWidth = "200px";
                    imagen.style.borderRadius = "8px";
                    vista.appendChild(imagen);
                }
            }

            formProducto.reset();
            await cargarProductos();

        } catch (error) {
            mensaje.textContent = "Error: " + error.message;
        } finally {
            boton.disabled = false;
        }
    });
}



document.getElementById("formEditar")
    .addEventListener("submit", async function(evento) {
        evento.preventDefault();

        const id = document.getElementById("editarId").value;
        const nombre = document.getElementById("editarNombre").value.trim();
        const precio = document.getElementById("editarPrecio").value;
        const categoria = document.getElementById("editarCategoria").value.trim();
        const archivo = document.getElementById("editarImagen").files[0];
        const mensaje = document.getElementById("mensajeEditar");
        const boton = evento.target.querySelector('button[type="submit"]');

        if (!nombre) {
            mensaje.textContent = "El nombre es obligatorio.";
            return;
        }

        const tipos = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };

        if (archivo && !tipos[archivo.type]) {
            mensaje.textContent = "Solo JPG, PNG o WEBP.";
            return;
        }

        if (archivo && archivo.size > 5 * 1024 * 1024) {
            mensaje.textContent = "La imagen no debe superar 5 MB.";
            return;
        }

        if (boton.disabled) return;
        boton.disabled = true;

        let rutaNueva = null;

        try {
            const cambios = {
                nombre: nombre,
                precio: precio === "" ? null : Number(precio),
                categoria: categoria
            };

            if (archivo) {
                mensaje.textContent = "Subiendo nueva fotografía...";

                rutaNueva = "catalogo/" +
                    crypto.randomUUID() + "." + tipos[archivo.type];

                const { error: errorImagen } = await supabaseClient
                    .storage
                    .from("productos")
                    .upload(rutaNueva, archivo, {
                        contentType: archivo.type,
                        upsert: false
                    });

                if (errorImagen) {
                    throw new Error(errorImagen.message);
                }

                const { data } = supabaseClient
                    .storage
                    .from("productos")
                    .getPublicUrl(rutaNueva);

                cambios.imagen = data.publicUrl;
            }

            mensaje.textContent = "Guardando cambios...";

            const { error } = await supabaseClient
                .from("productos")
                .update(cambios)
                .eq("id", id);

            if (error) {
                if (rutaNueva) {
                    await supabaseClient.storage
                        .from("productos")
                        .remove([rutaNueva]);
                }

                rutaNueva = null;
                throw new Error(error.message);
            }

            mensaje.textContent = "¡Producto actualizado correctamente!";
            document.getElementById("editarImagen").value = "";

            await cargarProductos();

        } catch (error) {
            mensaje.textContent = "Error: " + error.message;
        } finally {
            boton.disabled = false;
        }
    });


document.getElementById("cancelarEdicion")
    .addEventListener("click", function() {
        document.getElementById("seccionEditar")
            .style.display = "none";
    });






