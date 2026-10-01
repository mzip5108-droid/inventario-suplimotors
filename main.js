
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { registrarItem, buscarItemPorCodigo,obtenerTodos, eliminarItem,actualizarUbicacion   } from './supabase.js';


// ============================================
// 2) ESCENA
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);


// ============================================
// 3) CÁMARA
// ============================================
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(8, 6, 12);


// ============================================
// 4) RENDERER
// ============================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);


// ============================================
// 5)para que el metal brille
// ============================================
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;


// ============================================
// 6) LUCES
// ============================================
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(luzAmbiente);

const luzSol = new THREE.DirectionalLight(0xffffff, 1.5);
luzSol.position.set(5, 12, 5);
luzSol.castShadow = true;
luzSol.shadow.mapSize.set(2048, 2048);
luzSol.shadow.camera.left = -15;
luzSol.shadow.camera.right = 15;
luzSol.shadow.camera.top = 15;
luzSol.shadow.camera.bottom = -15;
luzSol.shadow.camera.near = 0.5;
luzSol.shadow.camera.far = 50;
scene.add(luzSol);


// ============================================
// 7) CONSTANTES DEL CUARTO
// ============================================
const ANCHO_CUARTO  = 7.5;
const ALTO_CUARTO   = 4;
const LARGO_CUARTO  = 17;
const GROSOR_PARED  = 0.2;


// ============================================
// 8) CUARTO
// ============================================

// --- Piso ---
const piso = new THREE.Mesh(
  new THREE.PlaneGeometry(ANCHO_CUARTO, LARGO_CUARTO),
  new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, metalness: 0.05 })
);
piso.rotation.x = -Math.PI / 2;
piso.receiveShadow = true;
scene.add(piso);

// --- Techo ---
const techo = new THREE.Mesh(
  new THREE.PlaneGeometry(ANCHO_CUARTO, LARGO_CUARTO),
  new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 1 })
);
techo.rotation.x = Math.PI / 2;
techo.position.y = ALTO_CUARTO;
scene.add(techo);

// --- Material de las paredes (ladrillo) ---
const matPared = new THREE.MeshStandardMaterial({
  color: 0x9c3d2e,
  roughness: 0.95,
  metalness: 0
});

// Pared derecha (x = +6)
const paredDer = new THREE.Mesh(
  new THREE.BoxGeometry(GROSOR_PARED, ALTO_CUARTO, LARGO_CUARTO),
  matPared
);
paredDer.position.set(ANCHO_CUARTO / 2, ALTO_CUARTO / 2, 0);
paredDer.castShadow = true;
paredDer.receiveShadow = true;
scene.add(paredDer);

// Pared izquierda (x = -6)
const paredIzq = new THREE.Mesh(
  new THREE.BoxGeometry(GROSOR_PARED, ALTO_CUARTO, LARGO_CUARTO),
  matPared
);
paredIzq.position.set(-ANCHO_CUARTO / 2, ALTO_CUARTO / 2, 0);
paredIzq.castShadow = true;
paredIzq.receiveShadow = true;
scene.add(paredIzq);

// Pared trasera (z = -6)
const paredAtras = new THREE.Mesh(
  new THREE.BoxGeometry(ANCHO_CUARTO, ALTO_CUARTO, GROSOR_PARED),
  matPared
);
paredAtras.position.set(0, ALTO_CUARTO / 2, -LARGO_CUARTO / 2);
paredAtras.castShadow = true;
paredAtras.receiveShadow = true;
scene.add(paredAtras);

// Pared frontal (z = +6) — la dejamos sin poner para poder ver el interior



// ============================================
// 9) MATERIALES METÁLICOS
// ============================================
const matMetal = new THREE.MeshStandardMaterial({
  color: 0xb8c0c8,
  roughness: 0.3,
  metalness: 0.95
});

const matMetalOscuro = new THREE.MeshStandardMaterial({
  color: 0x6b7280,
  roughness: 0.4,
  metalness: 0.9
});

const matMadera = new THREE.MeshStandardMaterial({
  color: 0x5c3a1e,   // marrón madera
  roughness: 0.85,   // madera no brilla mucho
  metalness: 0
});
// ============================================
// 10) FUNCIÓN: ESTANTE METÁLICO
// ============================================
/**
 * estante
 * @param {number} ancho    
 * @param {number} alto     
 * @param {number} profundo 
 * @param {number} repisas  
 * @returns {THREE.Group}
 */
function crearEstante(ancho = 2, alto = 2.2, profundo = 0.5, repisas = 5, columnas = 1) {
  const grupo = new THREE.Group();
  const grosorRepisa = 0.04;
  const grosorParal  = 0.06;
  const matParal  = matMetalOscuro.clone();
  const matRepisa = matMadera.clone();


  // --- 4 parales verticales en las esquinas ---
  const paralGeo = new THREE.BoxGeometry(grosorParal, alto, grosorParal);
  const esquinas = [
    [-ancho/2 + grosorParal/2,  alto/2, -profundo/2 + grosorParal/2],
    [ ancho/2 - grosorParal/2,  alto/2, -profundo/2 + grosorParal/2],
    [-ancho/2 + grosorParal/2,  alto/2,  profundo/2 - grosorParal/2],
    [ ancho/2 - grosorParal/2,  alto/2,  profundo/2 - grosorParal/2],
  ];

  esquinas.forEach(pos => {
    const paral = new THREE.Mesh(paralGeo, matParal);
    paral.position.set(...pos);
    grupo.add(paral);
  });

  // --- Repisas horizontales  ---
  const repisaGeo = new THREE.BoxGeometry(ancho, grosorRepisa, profundo);
  for (let i = 0; i < repisas; i++) {
    const repisa = new THREE.Mesh(repisaGeo, matRepisa);
    const y = (alto / (repisas - 1)) * i;
    repisa.position.set(0, y, 0);
    grupo.add(repisa);
  }

  // --- Refuerzos cruzados en los laterales ---
  const refuerzoGeo = new THREE.BoxGeometry(0., alto * 1., 0);

 // --- Separadores verticales entre columnas  ---
  if (columnas > 1) {
    const grosorSeparador = 0.03;   
    const anchoColumna = ancho / columnas;

    for (let i = 1; i < columnas; i++) {
      const xLocal = -ancho / 2 + anchoColumna * i;

      // Separador vertical que cruza toda la altura
      const separador = new THREE.Mesh(
        new THREE.BoxGeometry(grosorSeparador, alto, profundo),
        matParal.clone()   // mismo material que los parales
      );
      separador.position.set(xLocal, alto / 2, 0);
      separador.castShadow = true;
      separador.receiveShadow = true;
      grupo.add(separador);
    }
  }
  // Sombras
  grupo.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return grupo;
}


// ============================================
// ESTANTESSSS
// ============================================

// Estante en la pared IZQUIERDA, mirando hacia adentro (+x)
const estanteIzq = crearEstante(17, 3, 0.4, 4, 9);
estanteIzq.name ='EST-IZQ-01'
estanteIzq.position.set(-ANCHO_CUARTO / 2 + GROSOR_PARED / 2 + 0.3, 0, 0);
estanteIzq.rotation.y = Math.PI / 2;
scene.add(estanteIzq);

// Estante en la pared DERECHA, mirando hacia adentro (-x)
const estanteDer = crearEstante(17, 3, 0.4, 4);
estanteDer.name = 'EST-DER-01'
estanteDer.position.set(ANCHO_CUARTO / 2 - GROSOR_PARED / 2 - 0.3, 0, 0);
estanteDer.rotation.y = -Math.PI / 2;
scene.add(estanteDer);

// Estante en la pared TRASERA, mirando hacia adentro (+z)
const estanteAtras = crearEstante(10, 3, 0.7, 4);
estanteAtras.name = 'EST-IZQ-02'
estanteAtras.position.set(-1.9, 0, -3.3);
estanteAtras.rotation.y = Math.PI / 2;
scene.add(estanteAtras);

const estante_4 = crearEstante(9, 3, 0.7, 4);
estante_4.name = 'EST-MID-01'
estante_4.position.set(-0.3, 0, -2.8);
estante_4.rotation.y = Math.PI / 2;
scene.add(estante_4);

const estante_5 = crearEstante(3.5, 3, 2, 4);
estante_5.name = 'EST-SUP-01'
estante_5.position.set(0, 0, 6.7);
estante_5.rotation.y = Math.PI / 2;
scene.add(estante_5);

const estante_6 = crearEstante(7, 3, 1, 4);
estante_6.name ='EST-MID-02'
estante_6.position.set(0.4, 0, -5);
estante_6.rotation.y = Math.PI / 2;
scene.add(estante_6);

const estante_7 = crearEstante(10, 3, 0.7, 4);

estante_7.position.set(2, 0, -3.4);
estante_7.name ='EST-DER-02'
estante_7.rotation.y = Math.PI / 2;
scene.add(estante_7);

const escritorio = crearEstante(2, 1, 0.7, 2);
escritorio.name = 'ESCRITORIO-1'
escritorio.traverse(hijo => {
  if (hijo.isMesh) hijo.material.color.set(0x4a4f57);
});
escritorio.position.set(0, 0, 4.5);
scene.add(escritorio);

// ============================================
// 12) CONTROLES
// ============================================
const controlsorbit = new OrbitControls(camera, renderer.domElement);
controlsorbit.target.set(0, 1.5, 0);
controlsorbit.enableDamping = true;
controlsorbit.dampingFactor = 0.08;
controlsorbit.maxPolarAngle = Math.PI / 2 - 0.05;   // no bajar del piso
controlsorbit.minDistance = 2;
controlsorbit.maxDistance = 30;


//================================
//PUERTAAAAAAA
//=================================
function crearPuerta({
  ancho = 1.0,
  alto = 2.2,
  grosor = 0.06,
  pos = [0, 0, 0],
  rotacionY = 0
} = {}) {

  const grupo = new THREE.Group();

  // --- Material negro mate (marco y estructura) ---
  const matNegro = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.6,
    metalness: 0.2
  });

  // --- Material del vidrio  ---
  const matVidrio = new THREE.MeshPhysicalMaterial({
    color: 0xaaccdd,
    roughness: 0.05,
    metalness: 0,
    transmission: 0.95,        
    transparent: true,
    opacity: 0.3,
    ior: 1.5,                  
    thickness: 0.02,
    side: THREE.DoubleSide
  });

  // --- Herrajes (manija y bisagras) plateados ---
  const matHerraje = new THREE.MeshStandardMaterial({
    color: 0xc0c8d0,
    roughness: 0.25,
    metalness: 0.95
  });

  const anchoMitad = ancho / 2;
  const altoMitad  = alto / 2;
  const anchoMarco = 0.08;   // grosor de los marcos verticales/horizontales

  // ============================================
  // 1) MARCO EXTERIOR DE LA PUERTA
  // ============================================

  // --- Lado izquierdo ---
  const altoInferior = alto * 0.5;   // 50% del alto

  const mitadInferior = new THREE.Mesh(
    new THREE.BoxGeometry(ancho, altoInferior, grosor),
    matNegro
  );
  mitadInferior.position.set(0, altoInferior / 2, 0);
  grupo.add(mitadInferior);

   const altoSuperior = alto - altoInferior;
  const ySuperior = altoInferior + altoSuperior / 2;

  // --- Marco negro alrededor del cristal (4 barras) ---

  // Marco superior
  const marcoSup = new THREE.Mesh(
    new THREE.BoxGeometry(ancho, anchoMarco, grosor),
    matNegro
  );
  marcoSup.position.set(0, alto - anchoMarco / 2, 0);
  grupo.add(marcoSup);

  // Marco izquierdo
  const marcoIzq = new THREE.Mesh(
    new THREE.BoxGeometry(anchoMarco, altoSuperior, grosor),
    matNegro
  );
  marcoIzq.position.set(-anchoMitad + anchoMarco / 2, ySuperior, 0);
  grupo.add(marcoIzq);

  // Marco derecho
  const marcoDer = new THREE.Mesh(
    new THREE.BoxGeometry(anchoMarco, altoSuperior, grosor),
    matNegro
  );
  marcoDer.position.set(anchoMitad - anchoMarco / 2, ySuperior, 0);
  grupo.add(marcoDer);

  // Barra horizontal central (divide la mitad negra del cristal)
  const barraMedia = new THREE.Mesh(
    new THREE.BoxGeometry(ancho, anchoMarco, grosor * 1.1),
    matNegro
  );
  barraMedia.position.set(0, altoInferior + anchoMarco / 2, 0);
  grupo.add(barraMedia);

  // --- El cristal grande (un solo vidrio, sin cruz) ---
  const vidrioAncho = ancho - anchoMarco * 2 - 0.02;
  const vidrioAlto  = altoSuperior - anchoMarco * 2 - 0.02;

  const vidrio = new THREE.Mesh(
    new THREE.BoxGeometry(vidrioAncho, vidrioAlto, grosor * 0.3),
    matVidrio
  );
  vidrio.position.set(0, ySuperior, 0);
  grupo.add(vidrio);

  // ============================================
  // 3) HERRAJES
  // ============================================

  // --- Manija larga horizontal (estilo tienda) ---
  const manijaSoporte1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.04, 12),
    matHerraje
  );
  manijaSoporte1.rotation.x = Math.PI / 2;
  manijaSoporte1.position.set(anchoMitad - 0.15, 1.1, grosor / 2 + 0.02);
  grupo.add(manijaSoporte1);

  const manijaSoporte2 = manijaSoporte1.clone();
  manijaSoporte2.position.set(anchoMitad - 0.15, 0.9, grosor / 2 + 0.02);
  grupo.add(manijaSoporte2);

  const manijaBarra = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.5, 12),
    matHerraje
  );
  manijaBarra.position.set(anchoMitad - 0.15, 1.0, grosor / 2 + 0.04);
  grupo.add(manijaBarra);

  // --- Bisagras (3 a la izquierda) ---
  [0.3, 1.1, 1.9].forEach(y => {
    const bisagra = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, grosor + 0.02),
      matHerraje
    );
    bisagra.position.set(-anchoMitad - 0.01, y, 0);
    grupo.add(bisagra);
  });

  // ============================================
  // 4) SOMBRAS Y POSICIÓN
  // ============================================
  grupo.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  grupo.position.set(...pos);
  grupo.rotation.y = rotacionY;

  return grupo;
}
const puerta_oficina =crearPuerta({
  ancho: 1.0,
  alto:2,
  pos: [-1, 0, -LARGO_CUARTO / 2 + 0.1],
  rotacionY: 0

});
scene.add(puerta_oficina)


//====================================
//TERMINO DE LECTOR DE OBJETOS---------
//===========================================

// ============================================
// FASE 2: RESALTAR Y ENFOCAR EL OBJETO
// ============================================

function resaltarYEnfocar(objeto) {
  // --- 1. Guardar colores originales ---
  objeto.traverse(hijo => {
    if (hijo.isMesh && hijo.material) {
      hijo.userData.colorOriginal = hijo.material.color.getHex();
      hijo.userData.emissiveOriginal = hijo.material.emissive
        ? hijo.material.emissive.getHex()
        : 0x000000;
    }
  });

  // --- 2. Resaltar con color amarillo brillante ---
  objeto.traverse(hijo => {
    if (hijo.isMesh && hijo.material) {
      hijo.material.color.set(0xffcc00);          // amarillo
      if (hijo.material.emissive) {
        hijo.material.emissive.set(0x664400);     // brillo propio
      }
    }
  });

  // --- 3. Calcular la posición y tamaño del objeto ---
  const bbox = new THREE.Box3().setFromObject(objeto);
  const centro = bbox.getCenter(new THREE.Vector3());
  const tamaño = bbox.getSize(new THREE.Vector3());

  // --- 4. Mover la cámara hacia el objeto (vista isométrica) ---
  const distancia = Math.max(tamaño.x, tamaño.y, tamaño.z) * 1.8;

  const destinoCamara = new THREE.Vector3(
    centro.x + distancia,
    centro.y + distancia * 0.7,
    centro.z + distancia
  );

  // --- 5. Animar la cámara suavemente ---
  animarCamara(camera.position.clone(), destinoCamara, centro, 1200);

  // --- 6. Después de 5 segundos, quitar el resaltado ---
  setTimeout(() => {
    objeto.traverse(hijo => {
      if (hijo.isMesh && hijo.material) {
        hijo.material.color.set(hijo.userData.colorOriginal);
        if (hijo.material.emissive) {
          hijo.material.emissive.set(hijo.userData.emissiveOriginal);
        }
      }
    });
    console.log('🎨 Resaltado quitado');
  }, 5000);
}

// --- Animación de cámara con interpolación suave ---
function animarCamara(desde, hasta, objetivo, duracion) {
  const inicio = performance.now();

  function paso() {
    const ahora = performance.now();
    const t = Math.min((ahora - inicio) / duracion, 1);

    // Curva suave (ease in-out)
    const suave = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Interpolar posición
    camera.position.lerpVectors(desde, hasta, suave);

    // Interpolar el punto de mira
    controlsorbit.target.lerp(objetivo, suave);

    if (t < 1) {
      requestAnimationFrame(paso);
    } else {
      console.log('🎥 Cámara enfocada en el objeto');
    }
  }
  paso();
}



//============================================
//TERMINO DE RESALTADO DE OBJETOSSS----------
//=================================================

// ============================================
// CONTROLES DE JUGADOR (FPS)
// ============================================
const fpsControls = new PointerLockControls(camera, renderer.domElement);

let modoJugador = false;


document.body.addEventListener('click', () => {
  if (!fpsControls.isLocked && modoJugador) {
    fpsControls.lock();
  }
});

// Teclas presionadas
const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup',   e => keys[e.code] = false);

// Reloj para medir tiempo entre frames
const clock = new THREE.Clock();

// Estado

// Tecla TAB para alternar entre modos
document.addEventListener('keydown', e => {
  if (e.code === 'Tab') {
    e.preventDefault();
    modoJugador = !modoJugador;

    if (modoJugador) {
      // Activar FPS
      controlsorbit.enabled = false;
      camera.position.set(0, 1.7, 5);   // altura de ojos
      camera.lookAt(0, 1.7, 0);
      console.log('🕹️ Modo JUGADOR (WASD para moverse, clic para bloquear ratón)');
    } else {
      // Volver a orbitar
      if (fpsControls.isLocked) fpsControls.unlock();
      controlsorbit.enabled = true;
      camera.position.set(8, 6, 12);
      console.log('🎥 Modo ORBITAR');
    }
  }
});

// ============================================
// 13) LOOP DE ANIMACIÓN
// ============================================
function animate() {
  const dt = clock.getDelta();

  // === MODO JUGADOR (FPS) ===
  if (modoJugador && fpsControls.isLocked) {
    const velocidad = 4;      // metros por segundo
    const sprint = keys['ShiftLeft'] ? 2 : 1;   // Shift = correr

    // Movimiento
    if (keys['KeyW']) fpsControls.moveForward(  velocidad * sprint * dt);
    if (keys['KeyS']) fpsControls.moveForward(- velocidad * sprint * dt);
    if (keys['KeyA']) fpsControls.moveRight(  - velocidad * sprint * dt);
    if (keys['KeyD']) fpsControls.moveRight(    velocidad * sprint * dt);

    // Altura fija (que no vuele ni se hunda)
    camera.position.y = 1.7;
  }

  // === MODO ORBITAR ===
  if (modoJugador === false) {
    controlsorbit.update();
  }



  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();



// ============================================
// 14) RESPONSIVE
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


// ============================================
// 16) PANEL DE REGISTRO DE ITEMS
// ============================================

const panel      = document.getElementById('panelRegistro');
const overlay    = document.getElementById('overlay');
const btnAbrir   = document.getElementById('btnAbrirPanel');
const btnCerrar  = document.getElementById('btnCancelar');
const btnRegist  = document.getElementById('btnRegistrar');
const qrPreview  = document.getElementById('qrPreview');
const btnMoverItem = document.getElementById('btnMoverItem');


// --- Abrir panel ---
btnAbrir.addEventListener('click', () => {
  panel.style.display = 'block';
  overlay.style.display = 'block';
});

// --- Cerrar panel ---
function cerrarPanel() {
  panel.style.display = 'none';
  overlay.style.display = 'none';
  qrPreview.innerHTML = '';
  document.getElementById('inputNombre').value = '';
  document.getElementById('inputCantidad').value = '1';

  document.getElementById('inputEstante').value = '';
  document.getElementById('inputRepisa').value = '0';
  document.getElementById('inputSeccion').value = 'A';
  document.getElementById('avisoUbicacion').style.display = 'none';
}

btnCerrar.addEventListener('click', cerrarPanel);
overlay.addEventListener('click', cerrarPanel);

// --- Registrar item ---
btnRegist.addEventListener('click', async () => {
  const nombre    = document.getElementById('inputNombre').value.trim();
  const categoria = document.getElementById('inputCategoria').value;
  const cantidad  = parseInt(document.getElementById('inputCantidad').value);
  const estante   = document.getElementById('inputEstante').value;
  const repisa    = parseInt(document.getElementById('inputRepisa').value);
  const seccion   = document.getElementById('inputSeccion').value;


  // Validación
  if (!nombre) {
    alert('Ponle un nombre al item');
    return;
  }
    if (!estante) {
    alert('📍 Debes escanear el QR del estante antes de registrar');
    return;
  }

  console.log('📝 Registrando:', { nombre, categoria, cantidad, estante, repisa });

  // --- Guardar en Supabase ---
  const itemGuardado = await registrarItem({
    nombre,
    categoria,
    cantidad,
    estante,
    repisa,
    seccion 
  });

  if (!itemGuardado) {
    alert('Error al registrar. Mira la consola.');
    return;
  }

  // --- Mostrar el QR generado ---
  mostrarQR(itemGuardado);

  // --- Crear el objeto 3D en la escena ---
  crearObjetoDesdeItem(itemGuardado);
});

// --- Mostrar el QR en el panel ---
function mostrarQR(item) {
  const urlQR = `${window.location.origin}${window.location.pathname}?id=${item.codigo}`;

  qrPreview.innerHTML = `
    <p style="font-size:13px; color:#4aff4a; margin:10px 0;">
      ✅ Item guardado: <b>${item.codigo}</b>
    </p>
    <p style="font-size:12px; color:#aaa; margin:5px 0;">
      Escanea o descarga este QR:
    </p>
  `;

  const canvas = document.createElement('canvas');
  qrPreview.appendChild(canvas);

  QRCode.toCanvas(canvas, urlQR, { width: 220, margin: 2 }, (error) => {
    if (error) {
      console.error('Error generando QR:', error);
      return;
    }

    // Botón para descargar
    const btnDescargar = document.createElement('button');
    btnDescargar.textContent = '⬇️ Descargar QR';
    btnDescargar.style.cssText = `
      margin-top: 12px; padding: 10px 18px;
      background: #2a7a2a; color: white; border: none;
      border-radius: 8px; cursor: pointer;
      font-size: 13px; font-weight: bold;
    `;
    btnDescargar.onclick = () => {
      const link = document.createElement('a');
      link.download = `qr-${item.codigo}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    qrPreview.appendChild(btnDescargar);
  });
}

// ============================================
// POSICIONES BASE DE CADA ESTANTE
// ============================================
// ============================================
// INFO DE ESTANTES CON DIVISIONES
// ============================================
const INFO_ESTANTES = {
  'EST-IZQ-01': {
    x: -3.35, y: 0, z: 0,
    rotacionY: Math.PI / 2,
    ancho: 17,
    alto: 3,
    repisas: 4,
    columnas: 9,
    letras: 'ABCDEFGHI',
    nombre: 'Estante izquierdo'
  }
};

const ALTURA_REPISA = 1;

// Calcula la posición 3D exacta de un slot
function calcularPosicionSlot(estanteId, repisa, seccion) {
  const info = INFO_ESTANTES[estanteId];
  if (!info) {
    console.warn('⚠️ Estante no encontrado:', estanteId);
    return [0, 0, 0];
  }

  // --- Posición LOCAL dentro del estante (sin rotación) ---
  const anchoColumna = info.ancho / info.columnas;
  const indiceColumna = info.letras.indexOf(seccion);
  const offsetXLocal = info.ancho / 2 - anchoColumna * (indiceColumna + 0.5);
  const yLocal = repisa * ALTURA_REPISA + 0.05;
  const zLocal = 0;

  // --- Aplicar rotación del estante a la posición local ---
  const cos = Math.cos(info.rotacionY);
  const sin = Math.sin(info.rotacionY);
  const xGlobal = info.x + offsetXLocal * cos - zLocal * sin;
  const zGlobal = info.z + offsetXLocal * sin + zLocal * cos;
  const yGlobal = info.y + yLocal;

  return [xGlobal, yGlobal, zGlobal];
}

// Genera código de ubicación legible
function generarCodigoUbicacion(estanteId, repisa, seccion) {
  return `${estanteId}-R${repisa}-${seccion}`;
}

// Tests en consola
console.log('🧪 Test de posiciones:');
console.log('  R0-A:', calcularPosicionSlot('EST-IZQ-01', 0, 'A'));
console.log('  R0-E:', calcularPosicionSlot('EST-IZQ-01', 0, 'E'));
console.log('  R0-I:', calcularPosicionSlot('EST-IZQ-01', 0, 'I'));
console.log('  R3-E:', calcularPosicionSlot('EST-IZQ-01', 3, 'E'));

// ============================================
// CREAR OBJETO 3D A PARTIR DE UN ITEM
// ============================================
function crearObjetoDesdeItem(item) {
  // Calcular posición exacta en el slot
  const pos = calcularPosicionSlot(
    item.estante,
    item.repisa || 0,
    item.seccion || 'E'
  );

  const color = colorPorCategoria(item.categoria);

  const grupo = new THREE.Group();
  grupo.name = item.codigo;
  grupo.userData = item;

  // Caja base
  const tamaño = [0.3, 0.2, 0.3];
  const caja = new THREE.Mesh(
    new THREE.BoxGeometry(...tamaño),
    new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.1
    })
  );
  caja.position.y = tamaño[1] / 2;
  caja.castShadow = true;
  caja.receiveShadow = true;
  grupo.add(caja);

  // Tapa
  const tapa = new THREE.Mesh(
    new THREE.BoxGeometry(tamaño[0] + 0.01, 0.02, tamaño[2] + 0.01),
    new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.5,
      metalness: 0.3
    })
  );
  tapa.position.y = tamaño[1] + 0.01;
  tapa.castShadow = true;
  grupo.add(tapa);

  grupo.position.set(...pos);
  scene.add(grupo);

  const codigoUbic = generarCodigoUbicacion(item.estante, item.repisa || 0, item.seccion || 'E');
  console.log('🎁 Objeto creado en slot:', codigoUbic, '→', pos);
  return grupo;
}

// ============================================
// COLOR SEGÚN CATEGORÍA
// ============================================
function colorPorCategoria(categoria) {
  const colores = {
    herramientas: 0x3366cc,
    fijaciones:   0xaa3333,
    electrico:    0x33aa77,
    plomeria:     0x66ccaa,
    pintura:      0xeeeeee,
    seguridad:    0xffaa33,
    general:      0x888888
  };
  return colores[categoria] || 0x888888;
}

// ============================================
// LECTOR DE QR DE ITEMS (?id=FERR-XXXX)
// ============================================
const paramsId = new URLSearchParams(window.location.search);
const idItemQR = paramsId.get('id');

if (idItemQR) {
  console.log('📱 QR de item escaneado:', idItemQR);

  (async () => {
    // 1. Buscar el item en Supabase
    const item = await buscarItemPorCodigo(idItemQR);

    if (!item) {
      console.warn('❌ Item no encontrado en la BD:', idItemQR);
      return;
    }

    console.log('✅ Item encontrado:', item.nombre, '| Cantidad:', item.cantidad);
    console.log('   Ubicación:', `${item.estante}-R${item.repisa}-${item.seccion}`);

    // 2. Crear el objeto 3D
    const objeto = crearObjetoDesdeItem(item);

    // 3. Resaltar y enfocar
    resaltarYEnfocar(objeto);
  })();
}
// ============================================
// PANEL DE INVENTARIO
// ============================================
const panelInventario     = document.getElementById('panelInventario');
const btnVerInventario    = document.getElementById('btnVerInventario');
const btnCerrarInventario = document.getElementById('btnCerrarInventario');
const inputBuscar         = document.getElementById('inputBuscar');
const listaItems          = document.getElementById('listaItems');
const contadorItems       = document.getElementById('contadorItems');
const panelFicha          = document.getElementById('panelFicha');
const fichaNombre         = document.getElementById('fichaNombre');
const fichaCodigo         = document.getElementById('fichaCodigo');
const fichaQR             = document.getElementById('fichaQR');
const fichaCategoria      = document.getElementById('fichaCategoria');
const fichaCantidad       = document.getElementById('fichaCantidad');
const fichaUbicacion      = document.getElementById('fichaUbicacion');
const fichaFecha          = document.getElementById('fichaFecha');
const btnVolverInventario = document.getElementById('btnVolverInventario');
const btnVerEn3D          = document.getElementById('btnVerEn3D');
const btnDescargarFichaQR = document.getElementById('btnDescargarFichaQR');
const btnEliminarItem = document.getElementById('btnEliminarItem');
// Modal de mover con QR
const panelMoverQR           = document.getElementById('panelMoverQR');
const pasoEstante            = document.getElementById('pasoEstante');
const pasoItem               = document.getElementById('pasoItem');
const inputEstanteDestino    = document.getElementById('inputEstanteDestino');
const inputItemMover         = document.getElementById('inputItemMover');
const resumenMover           = document.getElementById('resumenMover');
const btnCerrarMoverQR       = document.getElementById('btnCerrarMoverQR');
const btnCancelarMoverQR     = document.getElementById('btnCancelarMoverQR');
const btnConfirmarMoverQR    = document.getElementById('btnConfirmarMoverQR');
const btnEscanearEstante     = document.getElementById('btnEscanearEstante');
const btnEscanearItem        = document.getElementById('btnEscanearItem');

// Cache de todos los items (para no consultar Supabase cada vez)
let todosLosItems = [];
let itemActualEnFicha = null; 
let callbackEscaner = null; 

// --- Abrir el panel ---
btnVerInventario.addEventListener('click', async () => {
  panelInventario.style.display = 'block';
  overlay.style.display = 'block';

  // Cargar items desde Supabase (solo la primera vez)
  if (todosLosItems.length === 0) {
    listaItems.innerHTML = '<p style="color:#aaa; text-align:center;">Cargando items...</p>';
    todosLosItems = await obtenerTodos();
  }

  renderizarItems(todosLosItems);
});

// --- Cerrar el panel ---
btnCerrarInventario.addEventListener('click', () => {
  panelInventario.style.display = 'none';
  overlay.style.display = 'none';
  inputBuscar.value = '';
});

// --- Buscador ---
inputBuscar.addEventListener('input', () => {
  const texto = inputBuscar.value.toLowerCase().trim();
  const filtrados = todosLosItems.filter(item => {
    return (
      item.nombre?.toLowerCase().includes(texto) ||
      item.codigo?.toLowerCase().includes(texto) ||
      item.categoria?.toLowerCase().includes(texto) ||
      item.estante?.toLowerCase().includes(texto) ||
      item.seccion?.toLowerCase().includes(texto)
    );
  });
  renderizarItems(filtrados);
});

// --- Renderizar la lista ---
function renderizarItems(items) {
  contadorItems.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} encontrado${items.length !== 1 ? 's' : ''}`;

  if (items.length === 0) {
    listaItems.innerHTML = `
      <p style="color:#888; text-align:center; grid-column: 1 / -1;">
        No hay items para mostrar
      </p>`;
    return;
  }

  listaItems.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: #2a2a3e;
      border-left: 4px solid ${colorHex(item.categoria)};
      border-radius: 10px;
      padding: 15px;
      cursor: pointer;
      transition: transform 0.15s, background 0.15s;
    `;

    // Emoji según categoría
    const emojiCat = {
      herramientas: '🔧', fijaciones: '🔩', electrico: '⚡',
      plomeria: '🚿', pintura: '🎨', seguridad: '🦺', general: '📦'
    }[item.categoria] || '📦';

    card.innerHTML = `
      <div style="font-weight:bold; font-size:14px; margin-bottom:5px;">
        ${emojiCat} ${item.nombre}
      </div>
      <div style="font-size:11px; color:#aaa; margin-bottom:3px;">
        Código: ${item.codigo}
      </div>
      <div style="font-size:11px; color:#aaa; margin-bottom:3px;">
        📍 ${item.estante}-R${item.repisa}-${item.seccion}
      </div>
      <div style="font-size:11px; color:#4aff4a;">
        Cantidad: ${item.cantidad}
      </div>
    `;

  card.addEventListener('click', () => {
    abrirFicha(item);
  });

    // Hover
    card.addEventListener('mouseenter', () => {
      card.style.background = '#3a3a4e';
      card.style.transform = 'translateY(-2px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = '#2a2a3e';
      card.style.transform = 'translateY(0)';
    });

    listaItems.appendChild(card);
  });
}

// --- Helper: color en formato CSS desde el hex de categoría ---
function colorHex(categoria) {
  const colores = {
    herramientas: '#3366cc', fijaciones: '#aa3333', electrico: '#33aa77',
    plomeria: '#66ccaa', pintura: '#eeeeee', seguridad: '#ffaa33',
    general: '#888888'
  };
  return colores[categoria] || '#888888';
}

// ============================================
// FICHA DETALLADA DEL ITEM
// ============================================
function abrirFicha(item) {
  itemActualEnFicha = item;

  // Ocultar inventario, mostrar ficha
  panelInventario.style.display = 'none';
  panelFicha.style.display = 'block';

  // Rellenar datos
  fichaNombre.textContent = item.nombre || '—';
  fichaCodigo.textContent = item.codigo || '—';
  fichaCategoria.textContent = item.categoria || '—';
  fichaCantidad.textContent = item.cantidad || '0';

  const ubicacion = `${item.estante || '?'}-R${item.repisa ?? '?'}-${item.seccion || '?'}`;
  fichaUbicacion.textContent = ubicacion;

  // Fecha formateada
  const fecha = item.created_at
    ? new Date(item.created_at).toLocaleString('es-VE')
    : '—';
  fichaFecha.textContent = fecha;

  // Generar el QR de la ficha
  fichaQR.innerHTML = '';
  const urlQR = `${window.location.origin}${window.location.pathname}?id=${item.codigo}`;

  const canvas = document.createElement('canvas');
  fichaQR.appendChild(canvas);

  QRCode.toCanvas(canvas, urlQR, { width: 200, margin: 1 }, (error) => {
    if (error) {
      console.error('Error al generar el QR:', error);
      fichaQR.innerHTML = '<p style="color:#f44;">Error al generar QR</p>';
    }
  });
}

// --- Volver al inventario ---
btnVolverInventario.addEventListener('click', () => {
  panelFicha.style.display = 'none';
  panelInventario.style.display = 'block';
});

// --- Ver en 3D ---
btnVerEn3D.addEventListener('click', () => {
  if (!itemActualEnFicha) return;

  // Ocultar todo
  panelFicha.style.display = 'none';
  overlay.style.display = 'none';

  // Eliminar el objeto 3D si ya existe
  const existente = scene.getObjectByName(itemActualEnFicha.codigo);
  if (existente) scene.remove(existente);

  // Crear el objeto en la escena
  const objeto = crearObjetoDesdeItem(itemActualEnFicha);

  // Resaltar y enfocar
  resaltarYEnfocar(objeto);
});

// --- Descargar QR de la ficha ---
btnDescargarFichaQR.addEventListener('click', () => {
  if (!itemActualEnFicha) return;

  const canvas = fichaQR.querySelector('canvas');
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = `qr-${itemActualEnFicha.codigo}.png`;
  link.href = canvas.toDataURL();
  link.click();
});
// ============================================
// ELIMINAR ITEM
// ============================================
btnEliminarItem.addEventListener('click', async () => {
  if (!itemActualEnFicha) return;

  const item = itemActualEnFicha;

  // Confirmación
  const confirmado = confirm(
    `¿Eliminar "${item.nombre}"?\n\n` +
    `Código: ${item.codigo}\n` +
    `Ubicación: ${item.estante}-R${item.repisa}-${item.seccion}\n\n` +
    `Esta acción no se puede deshacer.`
  );

  if (!confirmado) return;

  // Eliminar de Supabase
  const ok = await eliminarItem(item.codigo);

  if (!ok) {
    alert('Error al eliminar. Mira la consola.');
    return;
  }

  // Eliminar de la lista local
  todosLosItems = todosLosItems.filter(i => i.codigo !== item.codigo);

  // Eliminar el objeto 3D de la escena si existe
  const objeto3D = scene.getObjectByName(item.codigo);
  if (objeto3D) scene.remove(objeto3D);

  // Aviso
  console.log('🗑️ Item eliminado:', item.codigo);

  // Volver al inventario y actualizar la lista
  panelFicha.style.display = 'none';
  panelInventario.style.display = 'block';
  renderizarItems(todosLosItems);
});

// ============================================
// MOVER ITEM ESCANEANDO QR
// ============================================

// --- Abrir el modal ---
btnMoverItem.addEventListener('click', () => {
  if (!itemActualEnFicha) return;

  // Resetear el modal
  inputEstanteDestino.value = '';
  inputItemMover.value = '';
  resumenMover.style.display = 'none';
  pasoItem.style.opacity = '0.5';
  pasoItem.style.pointerEvents = 'none';
  btnConfirmarMoverQR.style.opacity = '0.5';
  btnConfirmarMoverQR.style.pointerEvents = 'none';

  // Ocultar ficha, mostrar modal
  panelFicha.style.display = 'none';
  panelMoverQR.style.display = 'block';

  // Enfocar el primer input
  setTimeout(() => inputEstanteDestino.focus(), 100);
});

// --- Cerrar ---
function cerrarMoverQR() {
  panelMoverQR.style.display = 'none';
  panelFicha.style.display = 'block';
}
btnCerrarMoverQR.addEventListener('click', cerrarMoverQR);
btnCancelarMoverQR.addEventListener('click', cerrarMoverQR);

// --- Cuando el usuario escribe el estante destino ---
inputEstanteDestino.addEventListener('input', () => {
  const valor = inputEstanteDestino.value.trim();

  if (valor.length > 5) {
    // Habilitar el paso 2
    pasoItem.style.opacity = '1';
    pasoItem.style.pointerEvents = 'auto';
    setTimeout(() => inputItemMover.focus(), 100);
  } else {
    pasoItem.style.opacity = '0.5';
    pasoItem.style.pointerEvents = 'none';
  }

  actualizarResumen();
});

// --- Cuando el usuario escribe el código del item ---
inputItemMover.addEventListener('input', () => {
  actualizarResumen();
});

// --- Actualizar el resumen (vista previa) ---
function actualizarResumen() {
  const estante = inputEstanteDestino.value.trim();
  const item = inputItemMover.value.trim();

  if (estante && item) {
    resumenMover.style.display = 'block';
    resumenMover.innerHTML = `
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #4aff4a;">
        ✅ Listo para mover
      </p>
      <p style="margin: 4px 0; font-size: 12px;">
        <span style="color:#aaa;">Item:</span> <b>${item}</b>
      </p>
      <p style="margin: 4px 0; font-size: 12px;">
        <span style="color:#aaa;">Destino:</span> <b>${estante}</b>
      </p>
    `;
    btnConfirmarMoverQR.style.opacity = '1';
    btnConfirmarMoverQR.style.pointerEvents = 'auto';
  } else {
    resumenMover.style.display = 'none';
    btnConfirmarMoverQR.style.opacity = '0.5';
    btnConfirmarMoverQR.style.pointerEvents = 'none';
  }
}

btnEscanearEstante.addEventListener('click', () => {
  // Guardar que el resultado debe ir al campo de estante destino
  callbackEscaner = (textoQR) => {
    // Extraer el slot del QR
    try {
      const url = new URL(textoQR);
      const slot = url.searchParams.get('slot');
      if (slot) {
        inputEstanteDestino.value = slot;
        // Disparar el evento input para que se active el paso 2
        inputEstanteDestino.dispatchEvent(new Event('input'));
        console.log(' Slot escaneado:', slot);
      } else {
        alert(' Este QR no es de un slot de estante');
      }
    } catch {
      // Si no es URL, asumir que es el código directo
      inputEstanteDestino.value = textoQR;
      inputEstanteDestino.dispatchEvent(new Event('input'));
    }
  };

  // Abrir escáner con este callback
  abrirEscanerConCallback();
});

btnEscanearItem.addEventListener('click', () => {
  callbackEscaner = (textoQR) => {
    try {
      const url = new URL(textoQR);
      const id = url.searchParams.get('id');
      if (id) {
        inputItemMover.value = id;
        inputItemMover.dispatchEvent(new Event('input'));
        console.log('📦 Item escaneado:', id);
      } else {
        alert('❌ Este QR no es de un item');
      }
    } catch {
      inputItemMover.value = textoQR;
      inputItemMover.dispatchEvent(new Event('input'));
    }
  };

  abrirEscanerConCallback();
});

// --- Función auxiliar: abre el escáner pero usando el callback guardado ---
async function abrirEscanerConCallback() {
  panelEscaner.style.display = 'block';
  overlay.style.display = 'block';
  estadoEscaner.textContent = 'Iniciando cámara...';

  try {
    escanerActivo = new Html5Qrcode("lectorQR");

    await escanerActivo.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (textoQR) => {
        console.log('📱 QR escaneado:', textoQR);
        estadoEscaner.textContent = ' QR detectado';
        
        // Cerrar escáner
        cerrarEscaner();

        // Llamar al callback específico
        if (callbackEscaner) {
          callbackEscaner(textoQR);
          callbackEscaner = null;
        } else {
          manejarQR(textoQR);
        }
      },
      () => {}
    );

    estadoEscaner.textContent = ' Apunta al QR...';
  } catch (err) {
    console.error('Error al iniciar la cámara:', err);
    estadoEscaner.textContent = ' No se pudo acceder a la cámara';
  }
}

// --- Confirmar el movimiento ---
btnConfirmarMoverQR.addEventListener('click', async () => {
  const codigoEstante = inputEstanteDestino.value.trim();
  const codigoItem = inputItemMover.value.trim();

  if (!codigoEstante || !codigoItem) return;

  // --- Parsear el código del estante ---
  // Formato esperado: EST-IZQ-01-R2-E  ó  EST-IZQ-01-R2-E
  const match = codigoEstante.match(/^(EST-[A-Z]+-\d+)-R(\d+)-([A-Z])$/);
  
  if (!match) {
    alert(
      ' Formato de estante inválido.\n\n' +
      'Debe ser: EST-XXX-##-R#-X\n' +
      'Ejemplo: EST-IZQ-01-R2-E'
    );
    return;
  }

  const estante = match[1];       // EST-IZQ-01
  const repisa = parseInt(match[2]);  // 2
  const seccion = match[3];       // E

  console.log('🔀 Moviendo:', codigoItem, '→', `${estante}-R${repisa}-${seccion}`);

  // --- Verificar que el estante existe en INFO_ESTANTES ---
  if (!INFO_ESTANTES[estante]) {
    alert(
      ` El estante "${estante}" no está configurado en el sistema.\n\n` +
      `Solo están disponibles: ${Object.keys(INFO_ESTANTES).join(', ')}`
    );
    return;
  }

  // --- Verificar que el item existe en Supabase ---
  const item = await buscarItemPorCodigo(codigoItem);

  if (!item) {
    alert(` No existe un item con el código "${codigoItem}".`);
    return;
  }

  // --- Actualizar la ubicación en Supabase ---
  const actualizado = await actualizarUbicacion(codigoItem, estante, repisa, seccion);

  if (!actualizado) {
    alert(' Error al actualizar. Mira la consola.');
    return;
  }

  // --- Mover el objeto 3D si está en la escena ---
  const objeto3D = scene.getObjectByName(codigoItem);
  if (objeto3D) {
    const nuevaPos = calcularPosicionSlot(estante, repisa, seccion);
    objeto3D.position.set(...nuevaPos);
    console.log(' Objeto 3D movido a:', nuevaPos);
  }

  // --- Actualizar la lista local ---
  todosLosItems = todosLosItems.map(i => 
    i.codigo === codigoItem ? actualizado : i
  );

  // --- Aviso de éxito ---
  alert(
    ` Item movido correctamente:\n\n` +
    ` ${item.nombre} (${codigoItem})\n` +
    ` Nueva ubicación: ${estante}-R${repisa}-${seccion}`
  );

  console.log('  Movimiento completado');

  // --- Cerrar y volver al inventario ---
  cerrarMoverQR();
  panelFicha.style.display = 'none';
  panelInventario.style.display = 'block';
  renderizarItems(todosLosItems);
});

// ============================================
// PANEL DE CÓDIGOS DE SLOTS
// ============================================
const panelCodigos       = document.getElementById('panelCodigos');
const btnVerCodigos      = document.getElementById('btnVerCodigos');
const btnCerrarCodigos   = document.getElementById('btnCerrarCodigos');
const inputBuscarCodigo  = document.getElementById('inputBuscarCodigo');
const listaCodigos       = document.getElementById('listaCodigos');
const contadorCodigos    = document.getElementById('contadorCodigos');

let todosLosCodigos = [];   // cache


function generarTodosLosCodigos() {
  const codigos = [];
  for (const [estanteId, info] of Object.entries(INFO_ESTANTES)) {
    for (let repisa = 0; repisa < info.repisas; repisa++) {
      for (let i = 0; i < info.columnas; i++) {
        const seccion = info.letras[i];
        codigos.push({
          codigo: `${estanteId}-R${repisa}-${seccion}`,
          estante: estanteId,
          repisa,
          seccion,
          nombreEstante: info.nombre
        });
      }
    }
  }
  return codigos;
}

// --- Abrir el panel ---
btnVerCodigos.addEventListener('click', () => {
  panelCodigos.style.display = 'block';
  overlay.style.display = 'block';

  if (todosLosCodigos.length === 0) {
    todosLosCodigos = generarTodosLosCodigos();
  }

  renderizarCodigos(todosLosCodigos);
});

// --- Cerrar el panel ---
btnCerrarCodigos.addEventListener('click', () => {
  panelCodigos.style.display = 'none';
  overlay.style.display = 'none';
  inputBuscarCodigo.value = '';
});

// --- Buscador ---
inputBuscarCodigo.addEventListener('input', () => {
  const texto = inputBuscarCodigo.value.toLowerCase().trim();
  const filtrados = todosLosCodigos.filter(c =>
    c.codigo.toLowerCase().includes(texto) ||
    c.estante.toLowerCase().includes(texto)
  );
  renderizarCodigos(filtrados);
});

// --- Renderizar la lista de códigos, agrupados por estante ---
function renderizarCodigos(codigos) {
  contadorCodigos.textContent = `${codigos.length} código${codigos.length !== 1 ? 's' : ''}`;

  if (codigos.length === 0) {
    listaCodigos.innerHTML = `
      <p style="color:#888; text-align:center; grid-column: 1 / -1;">
        No hay códigos que coincidan
      </p>`;
    return;
  }

  listaCodigos.innerHTML = '';

  // --- Agrupar por estante ---
  const porEstante = {};
  codigos.forEach(c => {
    if (!porEstante[c.estante]) porEstante[c.estante] = [];
    porEstante[c.estante].push(c);
  });

  // --- Renderizar cada grupo ---
  Object.entries(porEstante).forEach(([estanteId, slots]) => {
    const info = INFO_ESTANTES[estanteId];

    // Título del estante
    const titulo = document.createElement('div');
    titulo.style.cssText = `
      grid-column: 1 / -1;
      margin-top: 20px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #4a7ab8;
      color: #4a7ab8;
      font-weight: bold;
      font-size: 16px;
    `;
    titulo.textContent = `📦 ${info?.nombre || estanteId} (${slots.length} slots)`;
    listaCodigos.appendChild(titulo);

    // Ordenar por repisa y luego por sección
    slots.sort((a, b) => {
      if (a.repisa !== b.repisa) return a.repisa - b.repisa;
      return a.seccion.localeCompare(b.seccion);
    });

    // Tarjetas de cada slot
    slots.forEach(c => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #2a2a3e;
        border-radius: 10px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
      `;

      // QR
      const canvas = document.createElement('canvas');
      canvas.style.cssText = `
        background: white;
        padding: 4px;
        border-radius: 6px;
      `;
      card.appendChild(canvas);

      // Código
      const codigo = document.createElement('div');
      codigo.style.cssText = `
        font-family: monospace;
        font-size: 11px;
        color: #4aff4a;
        text-align: center;
        word-break: break-all;
      `;
      codigo.textContent = c.codigo;
      card.appendChild(codigo);

      // Botones
      const botones = document.createElement('div');
      botones.style.cssText = `
        display: flex; gap: 6px; width: 100%;
      `;

      // Botón copiar
      const btnCopiar = document.createElement('button');
      btnCopiar.textContent = '📋';
      btnCopiar.title = 'Copiar código';
      btnCopiar.style.cssText = `
        flex: 1; padding: 6px; background: #4a7ab8; color: white;
        border: none; border-radius: 5px; cursor: pointer; font-size: 12px;
      `;
      btnCopiar.onclick = () => {
        navigator.clipboard.writeText(c.codigo).then(() => {
          btnCopiar.textContent = '✅';
          setTimeout(() => btnCopiar.textContent = '📋', 1500);
        });
      };
      botones.appendChild(btnCopiar);

      // Botón descargar
      const btnDescargar = document.createElement('button');
      btnDescargar.textContent = '⬇️';
      btnDescargar.title = 'Descargar QR';
      btnDescargar.style.cssText = `
        flex: 1; padding: 6px; background: #2a7a2a; color: white;
        border: none; border-radius: 5px; cursor: pointer; font-size: 12px;
      `;
      btnDescargar.onclick = () => {
        const link = document.createElement('a');
        link.download = `qr-${c.codigo}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      botones.appendChild(btnDescargar);

      card.appendChild(botones);
      listaCodigos.appendChild(card);

      // Generar el QR del slot
      const urlQR = `${window.location.origin}${window.location.pathname}?slot=${c.codigo}`;
      QRCode.toCanvas(canvas, urlQR, { width: 130, margin: 1 }, (error) => {
        if (error) {
          console.error('Error generando QR del slot:', c.codigo, error);
        }
      });
    });
  });
}

// ============================================
// LECTOR DE QR DE ESTANTES (?estante= / ?slot=)
// ============================================
const paramsEstante = new URLSearchParams(window.location.search);
const idEstante = paramsEstante.get('estante');
const idSlot = paramsEstante.get('slot');

// --- Si viene un estante completo (?estante=EST-IZQ-01) ---
if (idEstante) {
  console.log('📱 QR de estante escaneado:', idEstante);

  (async () => {
    const info = INFO_ESTANTES[idEstante];
    if (!info) {
      console.warn('❌ Estante no configurado:', idEstante);
      return;
    }

    // Cargar todos los items desde Supabase
    const itemsDesdeBD = await obtenerTodos();   

    // Filtrar los que están en este estante
    const itemsDelEstante = itemsDesdeBD.filter(i => i.estante === idEstante);

    console.log(`✅ ${itemsDelEstante.length} items en ${info.nombre}`);
    abrirPanelEstante(idEstante, itemsDelEstante);
  })();
}

// --- Si viene un slot específico (?slot=EST-IZQ-01-R2-E) ---
if (idSlot) {
  console.log('📱 QR de slot escaneado:', idSlot);

  (async () => {
    // Parsear el código del slot: EST-IZQ-01-R2-E
    const match = idSlot.match(/^(EST-[A-Z]+-\d+)-R(\d+)-([A-Z])$/);
    if (!match) {
      console.warn(' Formato de slot inválido:', idSlot);
      return;
    }

    const estante = match[1];
    const repisa = parseInt(match[2]);
    const seccion = match[3];

    const info = INFO_ESTANTES[estante];
    if (!info) {
      console.warn(' Estante no configurado:', estante);
      return;
    }

    // Cargar todos los items desde Supabase
    const itemsDesdeBD = await obtenerTodos();

    // Filtrar los que están en este slot específico
    const itemsDelSlot = itemsDesdeBD.filter(i =>
      i.estante === estante &&
      i.repisa === repisa &&
      i.seccion === seccion
    );

    console.log(` ${itemsDelSlot.length} items en ${idSlot}`);
    abrirPanelEstante(idSlot, itemsDelSlot, { estante, repisa, seccion });
  })();
}
// ============================================
// PANEL DE ITEMS DE UN ESTANTE O SLOT
// ============================================
const panelEstante         = document.getElementById('panelEstante');
const panelEstanteTitulo   = document.getElementById('panelEstanteTitulo');
const panelEstanteSub      = document.getElementById('panelEstanteSubtitulo');
const inputBuscarEstante   = document.getElementById('inputBuscarEstante');
const listaItemsEstante    = document.getElementById('listaItemsEstante');
const btnCerrarEstante     = document.getElementById('btnCerrarEstante');

let itemsActualesDelEstante = [];
let infoActualEstante = null;

// --- Abrir el panel ---
function abrirPanelEstante(codigoMostrado, items, infoSlot = null) {
  infoActualEstante = { codigoMostrado, infoSlot };
  itemsActualesDelEstante = items;

  // Título
  if (infoSlot) {
    // Es un slot específico
    panelEstanteTitulo.textContent = `📦 Slot: ${infoSlot.estante}-R${infoSlot.repisa}-${infoSlot.seccion}`;
    panelEstanteSub.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} en esta celda`;
  } else {
    // Es un estante completo
    const info = INFO_ESTANTES[codigoMostrado];
    panelEstanteTitulo.textContent = `📦 ${info?.nombre || codigoMostrado}`;
    panelEstanteSub.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} en este estante`;
  }

  // Ocultar todo lo demás, mostrar este panel
  document.querySelectorAll('[id^="panel"]').forEach(p => {
    if (p.id !== 'panelEstante') p.style.display = 'none';
  });
  overlay.style.display = 'block';
  panelEstante.style.display = 'block';

  renderizarItemsEstante(items);
}

// --- Cerrar ---
btnCerrarEstante.addEventListener('click', () => {
  panelEstante.style.display = 'none';
  overlay.style.display = 'none';
  inputBuscarEstante.value = '';
});

// --- Buscador interno ---
inputBuscarEstante.addEventListener('input', () => {
  const texto = inputBuscarEstante.value.toLowerCase().trim();
  const filtrados = itemsActualesDelEstante.filter(item =>
    item.nombre?.toLowerCase().includes(texto) ||
    item.codigo?.toLowerCase().includes(texto) ||
    item.categoria?.toLowerCase().includes(texto)
  );
  renderizarItemsEstante(filtrados);
});

// --- Renderizar los items del estante ---
function renderizarItemsEstante(items) {
  if (items.length === 0) {
    listaItemsEstante.innerHTML = `
      <p style="color:#888; text-align:center; grid-column: 1 / -1;">
        No hay items en esta zona
      </p>`;
    return;
  }

  listaItemsEstante.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: #2a2a3e;
      border-left: 4px solid ${colorHex(item.categoria)};
      border-radius: 10px;
      padding: 15px;
      cursor: pointer;
      transition: transform 0.15s, background 0.15s;
    `;

   

    // Al hacer clic, abre la ficha del item
    card.addEventListener('click', () => {
      panelEstante.style.display = 'none';
      abrirFicha(item);
    });

    card.addEventListener('mouseenter', () => {
      card.style.background = '#3a3a4e';
      card.style.transform = 'translateY(-2px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = '#2a2a3e';
      card.style.transform = 'translateY(0)';
    });

    listaItemsEstante.appendChild(card);
  });
}
// ============================================
// ESCÁNER DE QR CON CÁMARA
// ============================================
const panelEscaner    = document.getElementById('panelEscaner');
const lectorQR        = document.getElementById('lectorQR');
const estadoEscaner   = document.getElementById('estadoEscaner');
const btnEscanearQR   = document.getElementById('btnEscanearQR');
const btnCerrarEscaner = document.getElementById('btnCerrarEscaner');

let escanerActivo = null;

// --- Abrir el escáner ---
btnEscanearQR.addEventListener('click', () => {
  abrirEscaner();
});

async function abrirEscaner() {
  panelEscaner.style.display = 'block';
  overlay.style.display = 'block';
  estadoEscaner.textContent = 'Iniciando cámara...';

  try {
    escanerActivo = new Html5Qrcode("lectorQR");

    await escanerActivo.start(
      { facingMode: "environment" },   // cámara trasera
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (textoQR) => {
        // Éxito al escanear
        console.log('📱 QR escaneado:', textoQR);
        estadoEscaner.textContent = '✅ QR detectado';
        manejarQR(textoQR);
      },
      (error) => {
        // Errores de escaneo (ignorar, son normales)
      }
    );

    estadoEscaner.textContent = ' Apunta al QR...';
  } catch (err) {
    console.error('Error al iniciar la cámara:', err);
    estadoEscaner.textContent = ' No se pudo acceder a la cámara';
  }
}

// --- Cerrar el escáner ---
btnCerrarEscaner.addEventListener('click', async () => {
  await cerrarEscaner();
});

async function cerrarEscaner() {
  if (escanerActivo) {
    try {
      await escanerActivo.stop();
      escanerActivo.clear();
    } catch (e) {
      console.warn('Error al cerrar escáner:', e);
    }
    escanerActivo = null;
  }
  panelEscaner.style.display = 'none';
  overlay.style.display = 'none';
}

// --- Procesar el QR escaneado ---
async function manejarQR(textoQR) {
  // Detener la cámara
  await cerrarEscaner();

  // Analizar el contenido del QR
  let url;
  try {
    url = new URL(textoQR);
  } catch {
    // Si no es URL, mostrar el texto plano
    alert(`QR detectado: ${textoQR}`);
    return;
  }

  const idItem = url.searchParams.get('id');
  const idSlot = url.searchParams.get('slot');
  const idEstante = url.searchParams.get('estante');

  // --- Caso 1: QR de item ---
  if (idItem) {
    console.log(' Item escaneado:', idItem);
    const item = await buscarItemPorCodigo(idItem);
    if (item) {
      abrirFicha(item);
    } else {
      alert(` No se encontró el item: ${idItem}`);
    }
    return;
  }

  // --- Caso 2: QR de slot ---
  if (idSlot) {
    console.log(' Slot escaneado:', idSlot);
    const match = idSlot.match(/^(EST-[A-Z]+-\d+)-R(\d+)-([A-Z])$/);
    if (!match) {
      alert(` Formato de slot inválido: ${idSlot}`);
      return;
    }

    const estante = match[1];
    const repisa = parseInt(match[2]);
    const seccion = match[3];

    const itemsDesdeBD = await obtenerTodos();
    const itemsDelSlot = itemsDesdeBD.filter(i =>
      i.estante === estante &&
      i.repisa === repisa &&
      i.seccion === seccion
    );

    abrirPanelEstante(idSlot, itemsDelSlot, { estante, repisa, seccion });
    return;
  }

  // --- Caso 3: QR de estante completo ---
  if (idEstante) {
    console.log(' Estante escaneado:', idEstante);
    const itemsDesdeBD = await obtenerTodos();
    const itemsDelEstante = itemsDesdeBD.filter(i => i.estante === idEstante);
    abrirPanelEstante(idEstante, itemsDelEstante);
    return;
  }

  // --- Caso 4: QR desconocido ---
  alert(`QR reconocido pero sin parámetros conocidos:\n${textoQR}`);
}

// ============================================
// ESCANEAR UBICACIÓN AL REGISTRAR ITEM
// ============================================
const btnEscanearUbicacion  = document.getElementById('btnEscanearUbicacion');
const avisoUbicacion        = document.getElementById('avisoUbicacion');
const linkUbicacionManual   = document.getElementById('linkUbicacionManual');

// --- Función que procesa el código de ubicación (del QR o manual) ---
function procesarUbicacion(codigo) {
  const match = codigo.trim().match(/^(EST-[A-Z]+-\d+)-R(\d+)-([A-Z])$/);
  
  if (!match) {
    alert('❌ Formato inválido.\nDebe ser: EST-IZQ-01-R2-E');
    return false;
  }

  const [, estanteId, repisa, seccion] = match;

  // Verificar que el estante esté configurado
  if (!INFO_ESTANTES[estanteId]) {
    alert(`❌ El estante "${estanteId}" no está configurado en el sistema.`);
    return false;
  }

  // Rellenar los inputs ocultos
  document.getElementById('inputEstante').value = estanteId;
  document.getElementById('inputRepisa').value = parseInt(repisa);
  document.getElementById('inputSeccion').value = seccion;

  // Mostrar aviso
  avisoUbicacion.textContent = `✅ ${codigo.trim()}`;
  avisoUbicacion.style.display = 'block';

  console.log('📍 Ubicación detectada:', codigo.trim());
  return true;
}

// --- Botón de escanear QR de ubicación ---
btnEscanearUbicacion.addEventListener('click', () => {
  callbackEscaner = (textoQR) => {
    try {
      const url = new URL(textoQR);
      const slot = url.searchParams.get('slot');
      const estante = url.searchParams.get('estante');

      // Caso 1: QR de slot
      if (slot) {
        procesarUbicacion(slot);
        return;
      }

      // Caso 2: QR de estante completo (por defecto repisa 0, sección A)
      if (estante) {
        if (!INFO_ESTANTES[estante]) {
          alert(`❌ El estante "${estante}" no está configurado.`);
          return;
        }
        document.getElementById('inputEstante').value = estante;
        document.getElementById('inputRepisa').value = 0;
        document.getElementById('inputSeccion').value = 'A';
        avisoUbicacion.textContent = `✅ ${estante} (por defecto R0-A)`;
        avisoUbicacion.style.display = 'block';
        return;
      }

      alert('❌ Este QR no es de un estante o slot');
    } catch {
      // Si no es URL, intentar procesarlo como código directo
      procesarUbicacion(textoQR);
    }
  };

  abrirEscanerConCallback();
});

// --- Enlace de escribir manualmente ---
linkUbicacionManual.addEventListener('click', (e) => {
  e.preventDefault();
  const codigo = prompt(
    'Escribe el código del slot donde va el item:\n\n' +
    'Ejemplo: EST-IZQ-01-R2-E'
  );
  if (!codigo) return;
  procesarUbicacion(codigo);
});