import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { registrarItem, buscarItemPorCodigo, obtenerTodos, eliminarItem, actualizarUbicacion } from './api.js';

// ============================================
// 1) CONFIGURACION Y CONSTANTES
// ============================================


const ANCHO_CUARTO  = 7.5;
const ALTO_CUARTO   = 4;
const LARGO_CUARTO  = 17;
const GROSOR_PARED  = 0;

// Categorias centralizadas (colores, iconos y nombres)
const CATEGORIAS = {
  bombadeaceite: { hex: 0x3366cc, css: '#3366cc', emoji: '🛢️', nombre: 'Bomba de aceite' },
  fijaciones:    { hex: 0xaa3333, css: '#aa3333', emoji: '🔩', nombre: 'Fijaciones' },
  electrico:     { hex: 0x33aa77, css: '#33aa77', emoji: '⚡', nombre: 'Eléctrico' },
  plomeria:      { hex: 0x66ccaa, css: '#66ccaa', emoji: '🚿', nombre: 'Plomería' },
  pintura:       { hex: 0xeeeeee, css: '#eeeeee', emoji: '🎨', nombre: 'Pintura' },
  seguridad:     { hex: 0xffaa33, css: '#ffaa33', emoji: '🦺', nombre: 'Seguridad' },
  general:       { hex: 0x888888, css: '#888888', emoji: '📦', nombre: 'General' }
};

// ============================================
// 2) ESCENA, CAMARA Y RENDERER
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 6, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;

// ============================================
// 3) LUCES
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
// 4) CUARTO (PISO, TECHO Y PAREDES)
// ============================================
const piso = new THREE.Mesh(
  new THREE.PlaneGeometry(ANCHO_CUARTO, LARGO_CUARTO),
  new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, metalness: 0.05 })
);
piso.rotation.x = -Math.PI / 2;
piso.receiveShadow = true;
scene.add(piso);

const techo = new THREE.Mesh(
  new THREE.PlaneGeometry(ANCHO_CUARTO, LARGO_CUARTO),
  new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 1 })
);
techo.rotation.x = Math.PI / 2;
techo.position.y = ALTO_CUARTO;
scene.add(techo);

const matPared = new THREE.MeshStandardMaterial({
  color: 0x9C3D2E, // Corregido: sin el 00 extra
  roughness: 10,
  metalness: 0
});

const paredDer = new THREE.Mesh(
  new THREE.BoxGeometry(GROSOR_PARED, ALTO_CUARTO, LARGO_CUARTO),
  matPared
);
paredDer.position.set(ANCHO_CUARTO / 2, ALTO_CUARTO / 2, 0);
paredDer.castShadow = true;
paredDer.receiveShadow = true;
scene.add(paredDer);

const paredIzq = new THREE.Mesh(
  new THREE.BoxGeometry(GROSOR_PARED, ALTO_CUARTO, LARGO_CUARTO),
  matPared
);
paredIzq.position.set(-ANCHO_CUARTO / 2, ALTO_CUARTO / 2, 0);
paredIzq.castShadow = true;
paredIzq.receiveShadow = true;
scene.add(paredIzq);

const paredAtras = new THREE.Mesh(
  new THREE.BoxGeometry(ANCHO_CUARTO, ALTO_CUARTO, GROSOR_PARED),
  matPared
);
paredAtras.position.set(0, ALTO_CUARTO / 2, -LARGO_CUARTO / 2);
paredAtras.castShadow = true;
paredAtras.receiveShadow = true;
scene.add(paredAtras);

// ============================================
// 5) MATERIALES METALICOS Y DE MADERA
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
  color: 0x5c3a1e,
  roughness: 0.85,
  metalness: 0
});

// ============================================
// 6) FUNCION: CREAR ESTANTE
// ============================================
function crearEstante(ancho = 2, alto = 2.2, profundo = 0.5, repisas = 5, columnas = 1) {
  const grupo = new THREE.Group();
  const grosorRepisa = 0.04;
  const grosorParal  = 0.06;
  const matParal  = matMetalOscuro.clone();
  const matRepisa = matMadera.clone();

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

  const repisaGeo = new THREE.BoxGeometry(ancho, grosorRepisa, profundo);
  const pasoRepisa = repisas > 1 ? alto / (repisas - 1) : 0;
  
  for (let i = 0; i < repisas; i++) {
    const repisa = new THREE.Mesh(repisaGeo, matRepisa);
    const y = pasoRepisa * i;
    repisa.position.set(0, y, 0);
    grupo.add(repisa);
  }

  if (columnas > 1) {
    const grosorSeparador = 0.03;   
    const anchoColumna = ancho / columnas;

    for (let i = 1; i < columnas; i++) {
      const xLocal = -ancho / 2 + anchoColumna * i;
      const separador = new THREE.Mesh(
        new THREE.BoxGeometry(grosorSeparador, alto, profundo),
        matParal.clone()
      );
      separador.position.set(xLocal, alto / 2, 0);
      separador.castShadow = true;
      separador.receiveShadow = true;
      grupo.add(separador);
    }
  }

  grupo.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return grupo;
}

// ============================================
// 7) INSTANCIACION DE ESTANTES
// ============================================
const estanteIzq = crearEstante(17, 3, 0.4, 4, 9);
estanteIzq.name ='EST-IZQ-01';
estanteIzq.position.set(-ANCHO_CUARTO / 2 + GROSOR_PARED / 2 + 0.3, 0, 0);
estanteIzq.rotation.y = Math.PI / 2;
scene.add(estanteIzq);

const estanteDer = crearEstante(17, 3, 0.4, 4, 6);
estanteDer.name = 'EST-DER-01';
estanteDer.position.set(ANCHO_CUARTO / 2 - GROSOR_PARED / 2 - 0.3, 0, 0);
estanteDer.rotation.y = -Math.PI / 2;
scene.add(estanteDer);

const estanteAtras = crearEstante(10, 3, 0.7, 4, 6);
estanteAtras.name = 'EST-IZQ-02';
estanteAtras.position.set(-1.9, 0, -3.3);
estanteAtras.rotation.y = Math.PI / 2;
scene.add(estanteAtras);

const estante_4 = crearEstante(10, 3, 0.7, 4, 6);
estante_4.name = 'EST-MID-01';
estante_4.position.set( 0, 0, -3.3);
estante_4.rotation.y = Math.PI / 2;
scene.add(estante_4);

const estante_sup_izq = crearEstante(3.5, 3, 1, 4, 3);
estante_sup_izq.name = 'EST-SUP-IZQ';
estante_sup_izq.position.set(-0.5, 0, 6.7);
estante_sup_izq.rotation.y = Math.PI / 2;
scene.add(estante_sup_izq);

const estante_sup_der = crearEstante(3.5, 3, 1, 4, 3);
estante_sup_der.name = 'EST-SUP-DER';
estante_sup_der.position.set(0.5, 0, 6.7);
estante_sup_der.rotation.y = Math.PI / 2;
scene.add(estante_sup_der);

const estante_6 = crearEstante(7, 3, 1, 4, 4);
estante_6.name ='EST-MID-02';
estante_6.position.set(0.4, 0, -5);
estante_6.rotation.y = Math.PI / 2;
scene.add(estante_6);

const estante_7 = crearEstante(10, 3, 0.7, 4, 5);
estante_7.position.set(2, 0, -3.4);
estante_7.name ='EST-DER-02';
estante_7.rotation.y = Math.PI / 2;
scene.add(estante_7);

const escritorio = crearEstante(2, 1, 0.7, 2);
escritorio.name = 'ESCRITORIO-1';
escritorio.traverse(hijo => {
  if (hijo.isMesh) hijo.material.color.set(0x4a4f57);
});
escritorio.position.set(0, 0, 4.5);
scene.add(escritorio);

// ============================================
// 8) INFO DE ESTANTES (SINCRONIZADO CON LA ESCENA)
// ============================================
const INFO_ESTANTES = {
  'EST-IZQ-01': {
    x: -ANCHO_CUARTO / 2 + GROSOR_PARED / 2 + 0.3, 
    y: 0, z: 0,
    rotacionY: Math.PI / 2,
    ancho: 17, alto: 3,
    repisas: 4, columnas: 9,
    letras: 'ABCDEFGHI',
    nombre: 'Estante izquierdo'
  },
  'EST-DER-01': {
    x: ANCHO_CUARTO / 2 - GROSOR_PARED / 2 - 0.3, 
    y: 0, z: 0,
    rotacionY: -Math.PI / 2,
    ancho: 17, alto: 3,
    repisas: 4, columnas: 6,
    letras: 'ABCDEF',
    nombre: 'Estante derecho'
  },
  'EST-IZQ-02': {
    x: -1.9, y: 0, z: -3.3,
    rotacionY: Math.PI / 2,
    ancho: 10, alto: 3,
    repisas: 4, columnas: 6,
    letras: 'ABCDEF',
    nombre: 'Estante izquierdo atras'
  },
  'EST-MID-01': {
    x: 0, y: 0, z: -3.3,               
    rotacionY: Math.PI / 2,
    ancho: 10, alto: 3,                
    repisas: 4, columnas: 6,           
    letras: 'ABCDEF',
    nombre: 'Estante medio 1'
  },
  'EST-MID-02': {
    x: 0.4, y: 0, z: -5,
    rotacionY: Math.PI / 2,
    ancho: 7, alto: 3,
    repisas: 4, columnas: 4,
    letras: 'ABCD',
    nombre: 'Estante medio 2'
  },
  'EST-SUP-IZQ': {
    x: -0.5, y: 0, z: 6.7,             
    rotacionY: Math.PI / 2,
    ancho: 3.5, alto: 3,
    repisas: 4, columnas: 3,           
    letras: 'ABC',
    nombre: 'Estante superior izquierda'
  },
  'EST-SUP-DER': {
    x: 0.5, y: 0, z: 6.7,              
    rotacionY: Math.PI / 2,
    ancho: 3.5, alto: 3,
    repisas: 4, columnas: 3,           
    letras: 'ABC',
    nombre: 'Estante superior derecha'
  },
  'EST-DER-02': {
    x: 2, y: 0, z: -3.4,
    rotacionY: Math.PI / 2,
    ancho: 10, alto: 3,
    repisas: 4, columnas: 5,           
    letras: 'ABCDE',
    nombre: 'Estante derecho atras'
  }
};

const ALTURA_REPISA = 1;

function calcularPosicionSlot(estanteId, repisa, seccion) {
  const info = INFO_ESTANTES[estanteId];
  if (!info) {
    console.warn('Estante no encontrado:', estanteId);
    return [0, 0, 0];
  }

  const anchoColumna = info.ancho / info.columnas;
  const indiceColumna = info.letras.indexOf(seccion);
  const offsetXLocal = info.ancho / 2 - anchoColumna * (indiceColumna + 0.5);
  const yLocal = repisa * ALTURA_REPISA + 0.05;
  const zLocal = 0;

  const cos = Math.cos(info.rotacionY);
  const sin = Math.sin(info.rotacionY);
  const xGlobal = info.x + offsetXLocal * cos - zLocal * sin;
  const zGlobal = info.z + offsetXLocal * sin + zLocal * cos;
  const yGlobal = info.y + yLocal;

  return [xGlobal, yGlobal, zGlobal];
}

// ============================================
// 9) CONTROLES Y PUERTA
// ============================================
const controlsorbit = new OrbitControls(camera, renderer.domElement);
controlsorbit.target.set(0, 1.5, 0);
controlsorbit.enableDamping = true;
controlsorbit.dampingFactor = 0.08;
controlsorbit.maxPolarAngle = Math.PI / 2 - 0.05;
controlsorbit.minDistance = 2;
controlsorbit.maxDistance = 30;

function crearPuerta({ ancho = 1.0, alto = 2.2, grosor = 0.06, pos = [0, 0, 0], rotacionY = 0 } = {}) {
  const grupo = new THREE.Group();
  const matNegro = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.2 });
  const matVidrio = new THREE.MeshPhysicalMaterial({
    color: 0xaaccdd, roughness: 0.05, metalness: 0, transmission: 0.95,
    transparent: true, opacity: 0.3, ior: 1.5, thickness: 0.02, side: THREE.DoubleSide
  });
  const matHerraje = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, roughness: 0.25, metalness: 0.95 });

  const anchoMitad = ancho / 2;
  const anchoMarco = 0.08;

  const altoInferior = alto * 0.5;
  const mitadInferior = new THREE.Mesh(new THREE.BoxGeometry(ancho, altoInferior, grosor), matNegro);
  mitadInferior.position.set(0, altoInferior / 2, 0);
  grupo.add(mitadInferior);

  const altoSuperior = alto - altoInferior;
  const ySuperior = altoInferior + altoSuperior / 2;

  const marcoSup = new THREE.Mesh(new THREE.BoxGeometry(ancho, anchoMarco, grosor), matNegro);
  marcoSup.position.set(0, alto - anchoMarco / 2, 0);
  grupo.add(marcoSup);

  const marcoIzq = new THREE.Mesh(new THREE.BoxGeometry(anchoMarco, altoSuperior, grosor), matNegro);
  marcoIzq.position.set(-anchoMitad + anchoMarco / 2, ySuperior, 0);
  grupo.add(marcoIzq);

  const marcoDer = new THREE.Mesh(new THREE.BoxGeometry(anchoMarco, altoSuperior, grosor), matNegro);
  marcoDer.position.set(anchoMitad - anchoMarco / 2, ySuperior, 0);
  grupo.add(marcoDer);

  const barraMedia = new THREE.Mesh(new THREE.BoxGeometry(ancho, anchoMarco, grosor * 1.1), matNegro);
  barraMedia.position.set(0, altoInferior + anchoMarco / 2, 0);
  grupo.add(barraMedia);

  const vidrioAncho = ancho - anchoMarco * 2 - 0.02;
  const vidrioAlto  = altoSuperior - anchoMarco * 2 - 0.02;
  const vidrio = new THREE.Mesh(new THREE.BoxGeometry(vidrioAncho, vidrioAlto, grosor * 0.3), matVidrio);
  vidrio.position.set(0, ySuperior, 0);
  grupo.add(vidrio);

  const manijaSoporte1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.04, 12), matHerraje);
  manijaSoporte1.rotation.x = Math.PI / 2;
  manijaSoporte1.position.set(anchoMitad - 0.15, 1.1, grosor / 2 + 0.02);
  grupo.add(manijaSoporte1);

  const manijaSoporte2 = manijaSoporte1.clone();
  manijaSoporte2.position.set(anchoMitad - 0.15, 0.9, grosor / 2 + 0.02);
  grupo.add(manijaSoporte2);

  const manijaBarra = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 12), matHerraje);
  manijaBarra.position.set(anchoMitad - 0.15, 1.0, grosor / 2 + 0.04);
  grupo.add(manijaBarra);

  [0.3, 1.1, 1.9].forEach(y => {
    const bisagra = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, grosor + 0.02), matHerraje);
    bisagra.position.set(-anchoMitad - 0.01, y, 0);
    grupo.add(bisagra);
  });

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

const puerta_oficina = crearPuerta({ ancho: 1.0, alto: 2, pos: [-1, 0, -LARGO_CUARTO / 2 + 0.1], rotacionY: 0 });
scene.add(puerta_oficina);

// ============================================
// 10) FUNCIONES DE RESALTADO Y CAMARA
// ============================================
let timeoutResaltado = null;

function animarCamara(desde, hasta, objetivo, duracion) {
  const inicio = performance.now();
  function paso() {
    const ahora = performance.now();
    const t = Math.min((ahora - inicio) / duracion, 1);
    const suave = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.lerpVectors(desde, hasta, suave);
    controlsorbit.target.lerp(objetivo, suave);
    if (t < 1) requestAnimationFrame(paso);
  }
  paso();
}

function resaltarYEnfocar(objeto) {
  if (timeoutResaltado) {
    clearTimeout(timeoutResaltado);
    timeoutResaltado = null;
  }

  objeto.traverse(hijo => {
    if (hijo.isMesh && hijo.material) {
      hijo.userData.colorOriginal = hijo.material.color.getHex();
      hijo.userData.emissiveOriginal = hijo.material.emissive ? hijo.material.emissive.getHex() : 0x000000;
    }
  });

  objeto.traverse(hijo => {
    if (hijo.isMesh && hijo.material) {
      hijo.material.color.set(0xffcc00);
      if (hijo.material.emissive) hijo.material.emissive.set(0x664400);
    }
  });

  const bbox = new THREE.Box3().setFromObject(objeto);
  const centro = bbox.getCenter(new THREE.Vector3());
  const tamaño = bbox.getSize(new THREE.Vector3());
  const distancia = Math.max(tamaño.x, tamaño.y, tamaño.z) * 1.8;

  const destinoCamara = new THREE.Vector3(
    centro.x + distancia, centro.y + distancia * 0.7, centro.z + distancia
  );

  animarCamara(camera.position.clone(), destinoCamara, centro, 1200);

  timeoutResaltado = setTimeout(() => {
    objeto.traverse(hijo => {
      if (hijo.isMesh && hijo.material) {
        hijo.material.color.set(hijo.userData.colorOriginal);
        if (hijo.material.emissive) hijo.material.emissive.set(hijo.userData.emissiveOriginal);
      }
    });
    timeoutResaltado = null;
  }, 5000);
}

// ============================================
// 11) MODO JUGADOR (FPS) Y ANIMACION
// ============================================
const fpsControls = new PointerLockControls(camera, renderer.domElement);
let modoJugador = false;

document.body.addEventListener('click', () => {
  if (!fpsControls.isLocked && modoJugador) fpsControls.lock();
});

const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup',   e => keys[e.code] = false);

document.addEventListener('keydown', e => {
  if (e.code === 'Tab') {
    e.preventDefault();
    modoJugador = !modoJugador;
    if (modoJugador) {
      controlsorbit.enabled = false;
      camera.position.set(0, 1.7, 5);
      camera.lookAt(0, 1.7, 0);
    } else {
      if (fpsControls.isLocked) fpsControls.unlock();
      controlsorbit.enabled = true;
      camera.position.set(8, 6, 12);
    }
  }
});

const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta();
  if (modoJugador && fpsControls.isLocked) {
    const velocidad = 4;
    const sprint = keys['ShiftLeft'] ? 2 : 1;
    if (keys['KeyW']) fpsControls.moveForward(  velocidad * sprint * dt);
    if (keys['KeyS']) fpsControls.moveForward(- velocidad * sprint * dt);
    if (keys['KeyA']) fpsControls.moveRight(  - velocidad * sprint * dt);
    if (keys['KeyD']) fpsControls.moveRight(    velocidad * sprint * dt);
    camera.position.y = 1.7;
  }
  if (modoJugador === false) controlsorbit.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================
// 12) LOGICA DE OBJETOS E ITEMS
// ============================================
function crearCajaItem(color, tamaño, indice) {
  const variacion = (Math.random() - 0.5) * 0.15;
  const colorFinal = new THREE.Color(color).offsetHSL(0, 0, variacion);
  const caja = new THREE.Mesh(
    new THREE.BoxGeometry(tamaño, tamaño * 0.8, tamaño),
    new THREE.MeshStandardMaterial({ color: colorFinal, roughness: 0.65, metalness: 0.15 })
  );
  caja.castShadow = true;
  caja.receiveShadow = true;
  return caja;
}

function colorPorCategoria(categoria) {
  return CATEGORIAS[categoria]?.hex ?? 0x888888;
}

function colorHex(categoria) {
  return CATEGORIAS[categoria]?.css ?? '#888888';
}

function crearObjetoDesdeItem(item) {
  const info = INFO_ESTANTES[item.estante];
  if (!info) {
    console.warn('Estante no configurado:', item.estante);
    const grupoVacio = new THREE.Group();
    grupoVacio.name = item.codigo;
    scene.add(grupoVacio);
    return grupoVacio;
  }

  // 1. Recolectar TODOS los items de esa celda
  const codigosEnCelda = new Set();
  scene.children.forEach(hijo => {
    if (hijo.isGroup && hijo.userData
        && hijo.userData.estante === item.estante
        && hijo.userData.repisa === item.repisa
        && hijo.userData.seccion === item.seccion) {
      codigosEnCelda.add(hijo.name);
    }
  });
  codigosEnCelda.add(item.codigo);

  // 2. Eliminar los grupos existentes de esa celda
  const gruposABorrar = [];
  scene.children.forEach(hijo => {
    if (hijo.isGroup && codigosEnCelda.has(hijo.name)) {
      gruposABorrar.push(hijo);
    }
  });
  gruposABorrar.forEach(g => scene.remove(g));

  // 3. Recolectar los DATOS de todos los items de la celda
  const itemsEnCelda = [];
  todosLosItems.forEach(i => {
    if (i.estante === item.estante
        && i.repisa === item.repisa
        && i.seccion === item.seccion
        && i.codigo !== item.codigo) {
      itemsEnCelda.push(i);
    }
  });
  itemsEnCelda.push(item);
  itemsEnCelda.sort((a, b) => a.codigo.localeCompare(b.codigo));

  // 4. Calcular el layout
  const anchoCelda = info.ancho / info.columnas;
  const repisaY    = (item.repisa || 0) * ALTURA_REPISA + 0.05;
  const tamItem    = 0.18;
  const alturaItem = tamItem * 0.75;
  const margenCelda = 0.25;
  const totalItems = itemsEnCelda.length;
  const anchoDisponible = anchoCelda - margenCelda * 2;
  const anchoPorItem = anchoDisponible / totalItems;

  const indiceColumna = info.letras.indexOf(item.seccion);
  const centroCeldaLocalX = info.ancho / 2 - anchoCelda * (indiceColumna + 0.5);
  const bordeIzqCelda = centroCeldaLocalX - anchoCelda / 2;

  const cos = Math.cos(info.rotacionY);
  const sin = Math.sin(info.rotacionY);

  // 5. Crear cada item
  const gruposCreados = [];

  itemsEnCelda.forEach((it, idx) => {
    const color = colorPorCategoria(it.categoria);
    const cantidad = Math.min(it.cantidad || 1, 5);
    const grupo = new THREE.Group();
    grupo.name = it.codigo;
    grupo.userData = it;

    const offsetDentroCelda = margenCelda + anchoPorItem * (idx + 0.5);
    const offsetLocalX = bordeIzqCelda + offsetDentroCelda;
    const offsetLocalZ = 0;

    const xMundo = info.x + offsetLocalX * cos - offsetLocalZ * sin;
    const zMundo = info.z + offsetLocalX * sin + offsetLocalZ * cos;
    const yMundo = info.y + repisaY;

    for (let n = 0; n < cantidad; n++) {
      const caja = crearCajaItem(color, tamItem, n);
      caja.position.set(xMundo, yMundo + (n * alturaItem), zMundo);
      caja.rotation.y = 0;
      grupo.add(caja);
    }

    scene.add(grupo);
    gruposCreados.push(grupo);
  });

  return gruposCreados.find(g => g.name === item.codigo);
}

// ============================================
// 13) LOGICA DE UI Y ESTADO GLOBAL
// ============================================
let todosLosItems = [];
let itemActualEnFicha = null; 
let callbackEscaner = null; 
let categoriaActualFiltro = null;
let todosLosCodigos = [];
let escanerActivo = null;
let modoMover = 'item';

// Referencias del DOM
const panel = document.getElementById('panelRegistro');
const overlay = document.getElementById('overlay');
const btnAbrir = document.getElementById('btnAbrirPanel');
const btnCerrar = document.getElementById('btnCancelar');
const btnRegist = document.getElementById('btnRegistrar');
const qrPreview = document.getElementById('qrPreview');
const btnMoverItem = document.getElementById('btnMoverItem');
const btnEliminarItem = document.getElementById('btnEliminarItem');

const panelInventario = document.getElementById('panelInventario');
const btnVerInventario = document.getElementById('btnVerInventario');
const btnCerrarInventario = document.getElementById('btnCerrarInventario');
const inputBuscar = document.getElementById('inputBuscar');
const listaItems = document.getElementById('listaItems');
const contadorItems = document.getElementById('contadorItems');
const btnVolverCategorias = document.getElementById('btnVolverCategorias');

const panelFicha = document.getElementById('panelFicha');
const fichaNombre = document.getElementById('fichaNombre');
const fichaCodigo = document.getElementById('fichaCodigo');
const fichaQR = document.getElementById('fichaQR');
const fichaCategoria = document.getElementById('fichaCategoria');
const fichaCantidad = document.getElementById('fichaCantidad');
const fichaUbicacion = document.getElementById('fichaUbicacion');
const fichaFecha = document.getElementById('fichaFecha');
const btnVolverInventario = document.getElementById('btnVolverInventario');
const btnVerEn3D = document.getElementById('btnVerEn3D');
const btnDescargarFichaQR = document.getElementById('btnDescargarFichaQR');

const panelMoverQR = document.getElementById('panelMoverQR');
const pasoEstante = document.getElementById('pasoEstante');
const pasoItem = document.getElementById('pasoItem');
const inputEstanteDestino = document.getElementById('inputEstanteDestino');
const inputItemMover = document.getElementById('inputItemMover');
const resumenMover = document.getElementById('resumenMover');
const btnCerrarMoverQR = document.getElementById('btnCerrarMoverQR');
const btnCancelarMoverQR = document.getElementById('btnCancelarMoverQR');
const btnConfirmarMoverQR = document.getElementById('btnConfirmarMoverQR');
const btnEscanearEstante = document.getElementById('btnEscanearEstante');
const btnEscanearItem = document.getElementById('btnEscanearItem');
const toggleModoDistribucion = document.getElementById('toggleModoDistribucion');
const listaAsignacionItems = document.getElementById('listaAsignacionItems');
const contenidoAsignacionItems = document.getElementById('contenidoAsignacionItems');
const btnModoItem = document.getElementById('btnModoItem');
const btnModoCategoria = document.getElementById('btnModoCategoria');
const inputCategoriaMover = document.getElementById('inputCategoriaMover');

const panelCodigos = document.getElementById('panelCodigos');
const btnVerCodigos = document.getElementById('btnVerCodigos');
const btnCerrarCodigos = document.getElementById('btnCerrarCodigos');
const inputBuscarCodigo = document.getElementById('inputBuscarCodigo');
const listaCodigos = document.getElementById('listaCodigos');
const contadorCodigos = document.getElementById('contadorCodigos');

const panelEstante = document.getElementById('panelEstante');
const panelEstanteTitulo = document.getElementById('panelEstanteTitulo');
const panelEstanteSub = document.getElementById('panelEstanteSubtitulo');
const inputBuscarEstante = document.getElementById('inputBuscarEstante');
const listaItemsEstante = document.getElementById('listaItemsEstante');
const btnCerrarEstante = document.getElementById('btnCerrarEstante');

const panelEscaner = document.getElementById('panelEscaner');
const estadoEscaner = document.getElementById('estadoEscaner');
const btnEscanearQR = document.getElementById('btnEscanearQR');
const btnCerrarEscaner = document.getElementById('btnCerrarEscaner');

const btnEscanearUbicacion = document.getElementById('btnEscanearUbicacion');
const avisoUbicacion = document.getElementById('avisoUbicacion');
const linkUbicacionManual = document.getElementById('linkUbicacionManual');

// ============================================
// 14) FUNCIONES DE REGISTRO DE ITEMS
// ============================================
btnAbrir.addEventListener('click', () => {
  panel.style.display = 'block';
  overlay.style.display = 'block';
});

function cerrarPanel() {
  panel.style.display = 'none';
  overlay.style.display = 'none';
  qrPreview.innerHTML = '';
  document.getElementById('inputNombre').value = '';
  document.getElementById('inputCantidad').value = '1';
  document.getElementById('inputEstante').value = '';
  document.getElementById('inputRepisa').value = '0';
  document.getElementById('inputSeccion').value = 'A';
  avisoUbicacion.style.display = 'none';
}

btnCerrar.addEventListener('click', cerrarPanel);
overlay.addEventListener('click', cerrarPanel);

btnRegist.addEventListener('click', async () => {
  const nombre = document.getElementById('inputNombre').value.trim();
  const categoria = document.getElementById('inputCategoria').value;
  const cantidad = parseInt(document.getElementById('inputCantidad').value);
  const estante = document.getElementById('inputEstante').value;
  const repisa = parseInt(document.getElementById('inputRepisa').value);
  const seccion = document.getElementById('inputSeccion').value;

  if (!nombre) { alert('Ponle un nombre al item'); return; }
  if (!estante) { alert('Debes escanear el QR del estante antes de registrar'); return; }

  const todosLosItemsActuales = await obtenerTodos();
  const nombreNormalizado = nombre.toLowerCase().trim();
  const duplicado = todosLosItemsActuales.find(i => i.nombre.toLowerCase().trim() === nombreNormalizado);

  if (duplicado) {
    alert(`Ya existe un item con el nombre "${nombre}".\nCodigo existente: ${duplicado.codigo}\nUsa otro nombre.`);
    return;
  }

  const itemGuardado = await registrarItem({ nombre, categoria, cantidad, estante, repisa, seccion });

  if (!itemGuardado) {
    alert('Error al registrar. Mira la consola.');
    return;
  }

  mostrarQR(itemGuardado);
  crearObjetoDesdeItem(itemGuardado);
  todosLosItems.unshift(itemGuardado);
});

function mostrarQR(item) {
  const urlQR = `${window.location.origin}${window.location.pathname}?id=${item.codigo}`;

  qrPreview.innerHTML = `
    <p style="font-size:13px; color:#4aff4a; margin:10px 0;">
      Item guardado: <b>${item.codigo}</b>
    </p>
    <p style="font-size:12px; color:#aaa; margin:5px 0;">
      Escanea o descarga este QR:
    </p>
  `;

  const canvas = document.createElement('canvas');
  qrPreview.appendChild(canvas);

  QRCode.toCanvas(canvas, urlQR, { width: 220, margin: 2 }, (error) => {
    if (error) { console.error('Error generando QR:', error); return; }

    const btnDescargar = document.createElement('button');
    btnDescargar.textContent = 'Descargar QR';
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
// 15) PANEL DE INVENTARIO Y CATEGORIAS
// ============================================
btnVerInventario.addEventListener('click', async () => {
  panelInventario.style.display = 'block';
  overlay.style.display = 'block';

  if (todosLosItems.length === 0) {
    listaItems.innerHTML = '<p style="color:#aaa; text-align:center;">Cargando items...</p>';
    todosLosItems = await obtenerTodos();
  }

  categoriaActualFiltro = null;
  inputBuscar.value = '';
  renderizarItemsFiltrados();
});

btnCerrarInventario.addEventListener('click', () => {
  panelInventario.style.display = 'none';
  overlay.style.display = 'none';
  inputBuscar.value = '';
  categoriaActualFiltro = null;
});

btnVolverCategorias.addEventListener('click', () => {
  categoriaActualFiltro = null;
  inputBuscar.value = '';
  renderizarItemsFiltrados();
});

inputBuscar.addEventListener('input', renderizarItemsFiltrados);

function renderizarCategorias(items) {
  contadorItems.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} en total`;
  btnVolverCategorias.style.display = 'none';

  if (items.length === 0) {
    listaItems.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1 / -1;">No hay items en el inventario</p>`;
    return;
  }

  const conteoCategorias = {};
  items.forEach(item => {
    const cat = item.categoria || 'general';
    conteoCategorias[cat] = (conteoCategorias[cat] || 0) + 1;
  });

  listaItems.innerHTML = '';

  Object.entries(conteoCategorias).forEach(([cat, count]) => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: #2a2a3e; border-left: 4px solid ${colorHex(cat)};
      border-radius: 10px; padding: 20px; cursor: pointer;
      transition: transform 0.15s, background 0.15s;
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    `;

    card.innerHTML = `
      <div style="font-weight:bold; font-size:16px;">
        ${CATEGORIAS[cat]?.emoji || '📦'} ${CATEGORIAS[cat]?.nombre || cat}
      </div>
      <div style="font-size:13px; color:#4aff4a; background:#1a2a1a; padding:4px 10px; border-radius:12px; font-weight:bold;">
        ${count}
      </div>
    `;

    card.addEventListener('click', () => {
      categoriaActualFiltro = cat;
      inputBuscar.value = '';
      renderizarItemsFiltrados();
    });

    card.addEventListener('mouseenter', () => { card.style.background = '#3a3a4e'; card.style.transform = 'translateY(-2px)'; });
    card.addEventListener('mouseleave', () => { card.style.background = '#2a2a3e'; card.style.transform = 'translateY(0)'; });

    listaItems.appendChild(card);
  });
}

function renderizarItems(items) {
  contadorItems.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} encontrado${items.length !== 1 ? 's' : ''}`;
  btnVolverCategorias.style.display = 'block';

  if (items.length === 0) {
    listaItems.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1 / -1;">No hay items para mostrar</p>`;
    return;
  }

  listaItems.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: #2a2a3e; border-left: 4px solid ${colorHex(item.categoria)};
      border-radius: 10px; padding: 15px; cursor: pointer;
      transition: transform 0.15s, background 0.15s;
    `;

    card.innerHTML = `
      <div style="font-weight:bold; font-size:14px; margin-bottom:5px;">${item.nombre}</div>
      <div style="font-size:11px; color:#aaa; margin-bottom:3px;">Codigo: ${item.codigo}</div>
      <div style="font-size:11px; color:#aaa; margin-bottom:3px;">${item.estante}-R${item.repisa}-${item.seccion}</div>
      <div style="font-size:11px; color:#4aff4a;">Cantidad: ${item.cantidad}</div>
    `;

    card.addEventListener('click', () => abrirFicha(item));
    card.addEventListener('mouseenter', () => { card.style.background = '#3a3a4e'; card.style.transform = 'translateY(-2px)'; });
    card.addEventListener('mouseleave', () => { card.style.background = '#2a2a3e'; card.style.transform = 'translateY(0)'; });

    listaItems.appendChild(card);
  });
}

function renderizarItemsFiltrados() {
  const texto = inputBuscar.value.toLowerCase().trim();

  if (texto.length > 0) {
    const filtrados = todosLosItems.filter(item => (
      item.nombre?.toLowerCase().includes(texto) ||
      item.codigo?.toLowerCase().includes(texto) ||
      item.categoria?.toLowerCase().includes(texto) ||
      item.estante?.toLowerCase().includes(texto) ||
      item.seccion?.toLowerCase().includes(texto)
    ));
    renderizarItems(filtrados);
    return;
  }

  if (categoriaActualFiltro === null) {
    renderizarCategorias(todosLosItems);
  } else {
    const filtrados = todosLosItems.filter(item => item.categoria === categoriaActualFiltro);
    renderizarItems(filtrados);
  }
}

// ============================================
// 16) FICHA Y EDICION DE ITEMS
// ============================================
function abrirFicha(item) {
  itemActualEnFicha = item;
  panelInventario.style.display = 'none';
  panelFicha.style.display = 'block';

  fichaNombre.textContent = item.nombre || '-';
  fichaCodigo.textContent = item.codigo || '-';
  fichaCategoria.textContent = CATEGORIAS[item.categoria]?.nombre || item.categoria || '-';
  fichaCantidad.textContent = item.cantidad || '0';
  fichaUbicacion.textContent = `${item.estante || '?'}-R${item.repisa ?? '?'}-${item.seccion || '?'}`;
  fichaFecha.textContent = item.created_at ? new Date(item.created_at).toLocaleString('es-VE') : '-';

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

btnVolverInventario.addEventListener('click', () => {
  panelFicha.style.display = 'none';
  panelInventario.style.display = 'block';
});

btnVerEn3D.addEventListener('click', () => {
  if (!itemActualEnFicha) return;
  panelFicha.style.display = 'none';
  overlay.style.display = 'none';
  const existente = scene.getObjectByName(itemActualEnFicha.codigo);
  if (existente) scene.remove(existente);
  const objeto = crearObjetoDesdeItem(itemActualEnFicha);
  resaltarYEnfocar(objeto);
});

btnDescargarFichaQR.addEventListener('click', () => {
  if (!itemActualEnFicha) return;
  const canvas = fichaQR.querySelector('canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `qr-${itemActualEnFicha.codigo}.png`;
  link.href = canvas.toDataURL();
  link.click();
});

btnEliminarItem.addEventListener('click', async () => {
  if (!itemActualEnFicha) return;
  const item = itemActualEnFicha;
  const confirmado = confirm(`Eliminar "${item.nombre}"?\nCodigo: ${item.codigo}\nEsta accion no se puede deshacer.`);
  if (!confirmado) return;

  const ok = await eliminarItem(item.codigo);
  if (!ok) { alert('Error al eliminar. Mira la consola.'); return; }

  todosLosItems = todosLosItems.filter(i => i.codigo !== item.codigo);
  const objeto3D = scene.getObjectByName(item.codigo);
  if (objeto3D) scene.remove(objeto3D);

  panelFicha.style.display = 'none';
  panelInventario.style.display = 'block';
  renderizarItems(todosLosItems);
});

// ============================================
// 17) MOVER ITEMS (LOGICA DE UI)
// ============================================
btnMoverItem.addEventListener('click', () => {
  if (!itemActualEnFicha) return;
  inputEstanteDestino.value = '';
  inputItemMover.value = '';
  resumenMover.style.display = 'none';
  pasoItem.style.opacity = '0.5';
  pasoItem.style.pointerEvents = 'none';
  btnConfirmarMoverQR.style.opacity = '0.5';
  btnConfirmarMoverQR.style.pointerEvents = 'none';
  panelFicha.style.display = 'none';
  panelMoverQR.style.display = 'block';
  setTimeout(() => inputEstanteDestino.focus(), 100);
});

function cerrarMoverQR() {
  panelMoverQR.style.display = 'none';
  panelFicha.style.display = 'block';
}

btnCerrarMoverQR.addEventListener('click', cerrarMoverQR);
btnCancelarMoverQR.addEventListener('click', cerrarMoverQR);

inputEstanteDestino.addEventListener('input', () => {
  const valor = inputEstanteDestino.value.trim();
  if (valor.length > 5) {
    pasoItem.style.opacity = '1';
    pasoItem.style.pointerEvents = 'auto';
    setTimeout(() => inputItemMover.focus(), 100);
  } else {
    pasoItem.style.opacity = '0.5';
    pasoItem.style.pointerEvents = 'none';
  }
  actualizarResumen();
});

inputItemMover.addEventListener('input', actualizarResumen);

function actualizarResumen() {
  actualizarResumenMover();
}

btnModoItem.addEventListener('click', () => {
  modoMover = 'item';
  btnModoItem.style.background = '#4a7ab8';
  btnModoItem.style.borderColor = '#4a7ab8';
  btnModoItem.style.color = 'white';
  btnModoCategoria.style.background = '#2a2a3e';
  btnModoCategoria.style.borderColor = '#444';
  btnModoCategoria.style.color = '#aaa';
  inputCategoriaMover.style.display = 'none';
  inputCategoriaMover.value = 'bombadeaceite';
  toggleModoDistribucion.style.display = 'none';
  pasoItem.style.display = 'block';
  actualizarResumen();
});

btnModoCategoria.addEventListener('click', () => {
  modoMover = 'categoria';
  btnModoCategoria.style.background = '#7a4ab8';
  btnModoCategoria.style.borderColor = '#7a4ab8';
  btnModoCategoria.style.color = 'white';
  btnModoItem.style.background = '#2a2a3e';
  btnModoItem.style.borderColor = '#444';
  btnModoItem.style.color = '#aaa';
  inputCategoriaMover.style.display = 'block';
  toggleModoDistribucion.style.display = 'block';
  inputItemMover.value = '';
  pasoItem.style.display = 'none';
  actualizarResumen();
});

document.querySelectorAll('input[name="modoDistribucion"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const modoElegido = document.querySelector('input[name="modoDistribucion"]:checked').value;
    if (modoElegido === 'asignar') {
      const codigoEstante = inputEstanteDestino.value.trim();
      const matchEstante = codigoEstante.match(/^(EST-[A-Z]+-\d+)-R\d+-[A-Z]$/);
      listaAsignacionItems.style.display = 'block';
      if (matchEstante) construirListaAsignacion(matchEstante[1]);
      else contenidoAsignacionItems.innerHTML = '<p style="color:#f44; font-size:12px;">Primero escanea un estante destino</p>';
    } else {
      listaAsignacionItems.style.display = 'none';
    }
    actualizarResumen();
  });
});

function actualizarResumenMover() {
  const estante = inputEstanteDestino.value.trim();
  if (modoMover === 'item') {
    const item = inputItemMover.value.trim();
    if (estante && item) {
      resumenMover.style.display = 'block';
      resumenMover.innerHTML = `
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #4aff4a;">Listo para mover</p>
        <p style="margin: 4px 0; font-size: 12px;"><span style="color:#aaa;">Modo:</span> <b>Item individual</b></p>
        <p style="margin: 4px 0; font-size: 12px;"><span style="color:#aaa;">Item:</span> <b>${item}</b></p>
        <p style="margin: 4px 0; font-size: 12px;"><span style="color:#aaa;">Destino:</span> <b>${estante}</b></p>
      `;
      btnConfirmarMoverQR.style.opacity = '1';
      btnConfirmarMoverQR.style.pointerEvents = 'auto';
    } else {
      resumenMover.style.display = 'none';
      btnConfirmarMoverQR.style.opacity = '0.5';
      btnConfirmarMoverQR.style.pointerEvents = 'none';
    }
  } else {
    const categoria = inputCategoriaMover.value;
    const modoDistribucion = document.querySelector('input[name="modoDistribucion"]:checked')?.value || 'juntar';
    let textoDistribucion = modoDistribucion === 'juntar' ? 'Todos en la misma celda' : (modoDistribucion === 'repartir' ? 'Repartir en celdas consecutivas' : 'Asignar celda a cada item');
    
    if (estante && categoria) {
      resumenMover.style.display = 'block';
      resumenMover.innerHTML = `
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #ffcc00;">Vas a mover TODA la categoria</p>
        <p style="margin: 4px 0; font-size: 12px;"><span style="color:#aaa;">Categoria:</span> <b>${categoria}</b></p>
        <p style="margin: 4px 0; font-size: 12px;"><span style="color:#aaa;">Distribucion:</span> <b>${textoDistribucion}</b></p>
        <p style="margin: 4px 0; font-size: 12px;"><span style="color:#aaa;">Destino:</span> <b>${estante}</b></p>
      `;
      btnConfirmarMoverQR.style.opacity = '1';
      btnConfirmarMoverQR.style.pointerEvents = 'auto';
    } else {
      resumenMover.style.display = 'none';
      btnConfirmarMoverQR.style.opacity = '0.5';
      btnConfirmarMoverQR.style.pointerEvents = 'none';
    }
  }
}

// ============================================
// 18) CALCULOS Y ASIGNACIONES
// ============================================
function construirListaAsignacion(estanteId) {
  const info = INFO_ESTANTES[estanteId];
  if (!info) {
    contenidoAsignacionItems.innerHTML = '<p style="color:#f44; font-size:12px;">Estante no configurado</p>';
    return;
  }

  const categoria = inputCategoriaMover.value;
  const itemsDeCategoria = todosLosItems.filter(i => i.categoria === categoria);

  if (itemsDeCategoria.length === 0) {
    contenidoAsignacionItems.innerHTML = '<p style="color:#f44; font-size:12px;">No hay items en esta categoria</p>';
    return;
  }

  const opcionesSlots = [];
  for (let r = 0; r < info.repisas; r++) {
    for (let i = 0; i < info.columnas; i++) {
      opcionesSlots.push(`${estanteId}-R${r}-${info.letras[i]}`);
    }
  }

  contenidoAsignacionItems.innerHTML = '';
  itemsDeCategoria.forEach((item, idx) => {
    const fila = document.createElement('div');
    fila.style.cssText = `display: flex; flex-direction: column; gap: 4px; padding: 8px 0; border-bottom: 1px solid #333;`;

    const nombre = document.createElement('div');
    nombre.style.cssText = `font-size: 12px; font-weight: bold; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
    nombre.textContent = `${idx + 1}. ${item.nombre}`;
    fila.appendChild(nombre);

    const select = document.createElement('select');
    select.className = 'select-celda-item';
    select.dataset.codigoItem = item.codigo;
    select.style.cssText = `width: 100%; padding: 6px; font-size: 11px; border-radius: 6px; border: 1px solid #333; background: #2a2a3e; color: white; font-family: monospace;`;

    const optVacia = document.createElement('option');
    optVacia.value = '';
    optVacia.textContent = 'Selecciona celda';
    select.appendChild(optVacia);

    opcionesSlots.forEach(codigo => {
      const opt = document.createElement('option');
      opt.value = codigo;
      opt.textContent = codigo;
      if (item.estante === estanteId && codigo === `${estanteId}-R${item.repisa}-${item.seccion}`) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    select.addEventListener('change', actualizarResumen);
    fila.appendChild(select);
    contenidoAsignacionItems.appendChild(fila);
  });
}

function generarSlotsDesde(estanteId, repisaInicio, seccionInicio, cantidad) {
  const info = INFO_ESTANTES[estanteId];
  if (!info) return [];

  const slots = [];
  const indiceInicio = info.letras.indexOf(seccionInicio);
  if (indiceInicio === -1) return [];

  for (let r = repisaInicio; r < info.repisas && slots.length < cantidad; r++) {
    const desdeSeccion = (r === repisaInicio) ? indiceInicio : 0;
    for (let i = desdeSeccion; i < info.columnas && slots.length < cantidad; i++) {
      slots.push({ repisa: r, seccion: info.letras[i] });
    }
  }
  return slots;
}

function calcularPosicionLibreEnSlot(estanteId, repisa, seccion) {
  const posBase = calcularPosicionSlot(estanteId, repisa, seccion);
  const info = INFO_ESTANTES[estanteId];
  if (!info) return posBase;

  let itemsEnSlot = 0;
  scene.children.forEach(hijo => {
    if (hijo.isGroup && hijo.userData && hijo.userData.estante === estanteId && hijo.userData.repisa === repisa && hijo.userData.seccion === seccion) {
      itemsEnSlot++;
    }
  });

  if (itemsEnSlot === 0) return posBase;

  const col = itemsEnSlot % 3;
  const fila = Math.floor(itemsEnSlot / 3) % 3;
  const capa = Math.floor(itemsEnSlot / 9);

  const offsetLocalX = (col - 1) * 0.2;
  const offsetLocalZ = (fila - 1) * 0.15;
  const offsetY = capa * 0.25;

  const cos = Math.cos(info.rotacionY);
  const sin = Math.sin(info.rotacionY);
  const offsetXGlobal = offsetLocalX * cos - offsetLocalZ * sin;
  const offsetZGlobal = offsetLocalX * sin + offsetLocalZ * cos;

  return [posBase[0] + offsetXGlobal, posBase[1] + offsetY, posBase[2] + offsetZGlobal];
}

function finalizarMovimiento() {
  cerrarMoverQR();
  panelFicha.style.display = 'none';
  panelInventario.style.display = 'block';
  renderizarItems(todosLosItems);
}

// ============================================
// 19) CONFIRMAR MOVIMIENTO
// ============================================
btnConfirmarMoverQR.addEventListener('click', async () => {
  const codigoEstante = inputEstanteDestino.value.trim();
  if (!codigoEstante) return;

  const match = codigoEstante.match(/^(EST-[A-Z]+-\d+)-R(\d+)-([A-Z])$/);
  if (!match) {
    alert('Formato de estante invalido.\nDebe ser: EST-XXX-##-R#-X\nEjemplo: EST-IZQ-01-R2-E');
    return;
  }

  const estante = match[1];
  const repisa = parseInt(match[2]);
  const seccion = match[3];

  if (!INFO_ESTANTES[estante]) {
    alert(`El estante "${estante}" no esta configurado.\nDisponibles: ${Object.keys(INFO_ESTANTES).join(', ')}`);
    return;
  }

  if (modoMover === 'item') {
    const codigoItem = inputItemMover.value.trim();
    if (!codigoItem) return;

    const item = await buscarItemPorCodigo(codigoItem);
    if (!item) { alert(`No existe un item con el codigo "${codigoItem}".`); return; }

    const actualizado = await actualizarUbicacion(codigoItem, estante, repisa, seccion);
    if (!actualizado) { alert('Error al actualizar. Mira la consola.'); return; }

    const objeto3D = scene.getObjectByName(codigoItem);
    if (objeto3D) {
      const nuevaPos = calcularPosicionLibreEnSlot(estante, repisa, seccion);
      objeto3D.position.set(...nuevaPos);
      objeto3D.userData.estante = estante;
      objeto3D.userData.repisa = repisa;
      objeto3D.userData.seccion = seccion;
    }

    todosLosItems = todosLosItems.map(i => i.codigo === codigoItem ? actualizado : i);
    alert(`Item movido correctamente:\n${item.nombre} (${codigoItem})\nNueva ubicacion: ${estante}-R${repisa}-${seccion}`);
    finalizarMovimiento();
    return;
  }

  if (modoMover === 'categoria') {
    const categoria = inputCategoriaMover.value;
    const modoDistribucion = document.querySelector('input[name="modoDistribucion"]:checked').value;
    const todos = await obtenerTodos();
    const itemsDeCategoria = todos.filter(i => i.categoria === categoria);

    if (itemsDeCategoria.length === 0) { alert(`No hay items registrados en la categoria "${categoria}".`); return; }

    let slotsDestino;
    let asignaciones = null;

    if (modoDistribucion === 'juntar') {
      slotsDestino = Array(itemsDeCategoria.length).fill({ repisa, seccion });
    } else if (modoDistribucion === 'repartir') {
      slotsDestino = generarSlotsDesde(estante, repisa, seccion, itemsDeCategoria.length);
      if (slotsDestino.length < itemsDeCategoria.length) {
        alert(`No hay suficientes slots desde R${repisa}-${seccion}.\nNecesitas: ${itemsDeCategoria.length}\nDisponibles: ${slotsDestino.length}`);
        return;
      }
    } else if (modoDistribucion === 'asignar') {
      const selects = document.querySelectorAll('.select-celda-item');
      asignaciones = [];
      for (const sel of selects) {
        const codigoCelda = sel.value;
        if (!codigoCelda) { alert('Debes asignar una celda a TODOS los items.'); return; }
        const m = codigoCelda.match(/^(EST-[A-Z]+-\d+)-R(\d+)-([A-Z])$/);
        if (!m) { alert(`Codigo de celda invalido: ${codigoCelda}`); return; }
        asignaciones.push({ codigoItem: sel.dataset.codigoItem, repisa: parseInt(m[2]), seccion: m[3] });
      }
      if (asignaciones.length !== itemsDeCategoria.length) { alert('La cantidad de asignaciones no coincide con los items.'); return; }
    }

    let mensajeConfirm;
    if (modoDistribucion === 'juntar') {
      mensajeConfirm = `Vas a mover ${itemsDeCategoria.length} item(s) de "${categoria}".\nTodos iran al mismo slot:\n${estante}-R${repisa}-${seccion}\n\nContinuar?`;
    } else if (modoDistribucion === 'repartir') {
      mensajeConfirm = `Vas a mover ${itemsDeCategoria.length} item(s) de "${categoria}".\nSe repartiran en ${slotsDestino.length} slot(s) consecutivos\ndesde ${estante}-R${repisa}-${seccion}.\n\nContinuar?`;
    } else {
      const resumenAsignaciones = asignaciones.map((a, i) => `  ${i + 1}. ${estante}-R${a.repisa}-${a.seccion}`).join('\n');
      mensajeConfirm = `Vas a mover ${itemsDeCategoria.length} item(s) de "${categoria}".\nAsignacion:\n${resumenAsignaciones}\n\nContinuar?`;
    }

    if (!confirm(mensajeConfirm)) return;

    let movidos = 0;
    let fallidos = 0;

    for (let i = 0; i < itemsDeCategoria.length; i++) {
      const item = itemsDeCategoria[i];
      let slot;
      if (modoDistribucion === 'asignar') {
        const asign = asignaciones.find(a => a.codigoItem === item.codigo);
        slot = { repisa: asign.repisa, seccion: asign.seccion };
      } else {
        slot = slotsDestino[i];
      }

      const ok = await actualizarUbicacion(item.codigo, estante, slot.repisa, slot.seccion);
      if (!ok) { fallidos++; continue; }

      const obj3D = scene.getObjectByName(item.codigo);
      if (obj3D) {
        const pos = calcularPosicionLibreEnSlot(estante, slot.repisa, slot.seccion);
        obj3D.position.set(...pos);
        obj3D.userData.estante = estante;
        obj3D.userData.repisa = slot.repisa;
        obj3D.userData.seccion = slot.seccion;
      }

      todosLosItems = todosLosItems.map(x => x.codigo === item.codigo ? { ...x, estante, repisa: slot.repisa, seccion: slot.seccion } : x);
      movidos++;
    }

    let mensaje = `${movidos} item(s) movidos correctamente.`;
    if (fallidos > 0) mensaje += `\n${fallidos} fallaron (mira la consola).`;
    alert(mensaje);
    finalizarMovimiento();
    return;
  }
});

// ============================================
// 20) PANEL DE CODIGOS Y GENERACION DE QR
// ============================================
function generarTodosLosCodigos() {
  const codigos = [];
  for (const [estanteId, info] of Object.entries(INFO_ESTANTES)) {
    for (let repisa = 0; repisa < info.repisas; repisa++) {
      for (let i = 0; i < info.columnas; i++) {
        codigos.push({ codigo: `${estanteId}-R${repisa}-${info.letras[i]}`, estante: estanteId, repisa, seccion: info.letras[i], nombreEstante: info.nombre });
      }
    }
  }
  return codigos;
}

btnVerCodigos.addEventListener('click', () => {
  panelCodigos.style.display = 'block';
  overlay.style.display = 'block';
  if (todosLosCodigos.length === 0) todosLosCodigos = generarTodosLosCodigos();
  renderizarCodigos(todosLosCodigos);
});

btnCerrarCodigos.addEventListener('click', () => {
  panelCodigos.style.display = 'none';
  overlay.style.display = 'none';
  inputBuscarCodigo.value = '';
});

inputBuscarCodigo.addEventListener('input', () => {
  const texto = inputBuscarCodigo.value.toLowerCase().trim();
  const filtrados = todosLosCodigos.filter(c => c.codigo.toLowerCase().includes(texto) || c.estante.toLowerCase().includes(texto));
  renderizarCodigos(filtrados);
});

function renderizarCodigos(codigos) {
  contadorCodigos.textContent = `${codigos.length} codigo${codigos.length !== 1 ? 's' : ''}`;
  if (codigos.length === 0) {
    listaCodigos.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1 / -1;">No hay codigos que coincidan</p>`;
    return;
  }

  listaCodigos.innerHTML = '';
  const porEstante = {};
  codigos.forEach(c => {
    if (!porEstante[c.estante]) porEstante[c.estante] = [];
    porEstante[c.estante].push(c);
  });

  Object.entries(porEstante).forEach(([estanteId, slots]) => {
    const info = INFO_ESTANTES[estanteId];
    const titulo = document.createElement('div');
    titulo.style.cssText = `grid-column: 1 / -1; margin-top: 20px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #4a7ab8; color: #4a7ab8; font-weight: bold; font-size: 16px;`;
    titulo.textContent = `${info?.nombre || estanteId} (${slots.length} slots)`;
    listaCodigos.appendChild(titulo);

    slots.sort((a, b) => a.repisa !== b.repisa ? a.repisa - b.repisa : a.seccion.localeCompare(b.seccion));

    slots.forEach(c => {
      const card = document.createElement('div');
      card.style.cssText = `background: #2a2a3e; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; align-items: center;`;

      const canvas = document.createElement('canvas');
      canvas.style.cssText = `background: white; padding: 4px; border-radius: 6px;`;
      card.appendChild(canvas);

      const codigo = document.createElement('div');
      codigo.style.cssText = `font-family: monospace; font-size: 11px; color: #4aff4a; text-align: center; word-break: break-all;`;
      codigo.textContent = c.codigo;
      card.appendChild(codigo);

      const botones = document.createElement('div');
      botones.style.cssText = `display: flex; gap: 6px; width: 100%;`;

      const btnCopiar = document.createElement('button');
      btnCopiar.textContent = 'Copiar';
      btnCopiar.style.cssText = `flex: 1; padding: 6px; background: #4a7ab8; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;`;
      btnCopiar.onclick = () => {
        navigator.clipboard.writeText(c.codigo).then(() => {
          btnCopiar.textContent = 'Copiado';
          setTimeout(() => btnCopiar.textContent = 'Copiar', 1500);
        });
      };
      botones.appendChild(btnCopiar);

      const btnDescargar = document.createElement('button');
      btnDescargar.textContent = 'Descargar';
      btnDescargar.style.cssText = `flex: 1; padding: 6px; background: #2a7a2a; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;`;
      btnDescargar.onclick = () => {
        const link = document.createElement('a');
        link.download = `qr-${c.codigo}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      botones.appendChild(btnDescargar);

      card.appendChild(botones);
      listaCodigos.appendChild(card);

      const urlQR = `${window.location.origin}${window.location.pathname}?slot=${c.codigo}`;
      QRCode.toCanvas(canvas, urlQR, { width: 130, margin: 1 }, (error) => {
        if (error) console.error('Error generando QR del slot:', c.codigo, error);
      });
    });
  });
}

// ============================================
// 21) PANEL DE ESTANTE / SLOT
// ============================================
let itemsActualesDelEstante = [];
let infoActualEstante = null;

function abrirPanelEstante(codigoMostrado, items, infoSlot = null) {
  infoActualEstante = { codigoMostrado, infoSlot };
  itemsActualesDelEstante = items;

  if (infoSlot) {
    panelEstanteTitulo.textContent = `Slot: ${infoSlot.estante}-R${infoSlot.repisa}-${infoSlot.seccion}`;
    panelEstanteSub.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} en esta celda`;
  } else {
    const info = INFO_ESTANTES[codigoMostrado];
    panelEstanteTitulo.textContent = info?.nombre || codigoMostrado;
    panelEstanteSub.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} en este estante`;
  }

  document.querySelectorAll('[id^="panel"]').forEach(p => {
    if (p.id !== 'panelEstante') p.style.display = 'none';
  });
  overlay.style.display = 'block';
  panelEstante.style.display = 'block';
  renderizarItemsEstante(items);
}

btnCerrarEstante.addEventListener('click', () => {
  panelEstante.style.display = 'none';
  overlay.style.display = 'none';
  inputBuscarEstante.value = '';
});

inputBuscarEstante.addEventListener('input', () => {
  const texto = inputBuscarEstante.value.toLowerCase().trim();
  const filtrados = itemsActualesDelEstante.filter(item =>
    item.nombre?.toLowerCase().includes(texto) ||
    item.codigo?.toLowerCase().includes(texto) ||
    item.categoria?.toLowerCase().includes(texto)
  );
  renderizarItemsEstante(filtrados);
});

function renderizarItemsEstante(items) {
  if (items.length === 0) {
    listaItemsEstante.innerHTML = `<p style="color:#888; text-align:center; grid-column: 1 / -1;">No hay items en esta zona</p>`;
    return;
  }

  listaItemsEstante.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.style.cssText = `background: #2a2a3e; border-left: 4px solid ${colorHex(item.categoria)}; border-radius: 10px; padding: 15px; cursor: pointer; transition: transform 0.15s, background 0.15s;`;
    card.innerHTML = `
      <div style="font-weight:bold; font-size:14px; margin-bottom:5px;">${item.nombre}</div>
      <div style="font-size:11px; color:#aaa; margin-bottom:3px;">Codigo: ${item.codigo}</div>
      <div style="font-size:11px; color:#aaa; margin-bottom:3px;">${item.estante}-R${item.repisa}-${item.seccion}</div>
      <div style="font-size:11px; color:#4aff4a;">Cantidad: ${item.cantidad}</div>
    `;

    card.addEventListener('click', () => {
      panelEstante.style.display = 'none';
      abrirFicha(item);
    });
    card.addEventListener('mouseenter', () => { card.style.background = '#3a3a4e'; card.style.transform = 'translateY(-2px)'; });
    card.addEventListener('mouseleave', () => { card.style.background = '#2a2a3e'; card.style.transform = 'translateY(0)'; });
    listaItemsEstante.appendChild(card);
  });
}

// ============================================
// 22) ESCANER QR
// ============================================
btnEscanearQR.addEventListener('click', () => abrirEscaner());

async function abrirEscaner() {
  panelEscaner.style.display = 'block';
  overlay.style.display = 'block';
  estadoEscaner.textContent = 'Iniciando camara...';

  try {
    escanerActivo = new Html5Qrcode("lectorQR");
    await escanerActivo.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (textoQR) => {
        estadoEscaner.textContent = 'QR detectado';
        manejarQR(textoQR);
      },
      () => {}
    );
    estadoEscaner.textContent = 'Apunta al QR...';
  } catch (err) {
    console.error('Error al iniciar la camara:', err);
    estadoEscaner.textContent = 'No se pudo acceder a la camara';
  }
}

btnCerrarEscaner.addEventListener('click', async () => await cerrarEscaner());

async function cerrarEscaner() {
  if (escanerActivo) {
    try {
      await escanerActivo.stop();
      escanerActivo.clear();
    } catch (e) { console.warn('Error al cerrar escaner:', e); }
    escanerActivo = null;
  }
  panelEscaner.style.display = 'none';
  overlay.style.display = 'none';
}

async function abrirEscanerConCallback() {
  panelEscaner.style.display = 'block';
  overlay.style.display = 'block';
  estadoEscaner.textContent = 'Iniciando camara...';

  try {
    escanerActivo = new Html5Qrcode("lectorQR");
    await escanerActivo.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (textoQR) => {
        estadoEscaner.textContent = 'QR detectado';
        cerrarEscaner();
        if (callbackEscaner) {
          callbackEscaner(textoQR);
          callbackEscaner = null;
        } else {
          manejarQR(textoQR);
        }
      },
      () => {}
    );
    estadoEscaner.textContent = 'Apunta al QR...';
  } catch (err) {
    console.error('Error al iniciar la camara:', err);
    estadoEscaner.textContent = 'No se pudo acceder a la camara';
  }
}

async function manejarQR(textoQR) {
  await cerrarEscaner();
  let url;
  try { url = new URL(textoQR); } catch { alert(`QR detectado: ${textoQR}`); return; }

  const idItem = url.searchParams.get('id');
  const idSlot = url.searchParams.get('slot');
  const idEstante = url.searchParams.get('estante');

  if (idItem) {
    const item = await buscarItemPorCodigo(idItem);
    if (item) abrirFicha(item);
    else alert(`No se encontro el item: ${idItem}`);
    return;
  }

  if (idSlot) {
    const match = idSlot.match(/^(EST-[A-Z]+-\d+)-R(\d+)-([A-Z])$/);
    if (!match) { alert(`Formato de slot invalido: ${idSlot}`); return; }
    const estante = match[1], repisa = parseInt(match[2]), seccion = match[3];
    const itemsDesdeBD = await obtenerTodos();
    const itemsDelSlot = itemsDesdeBD.filter(i => i.estante === estante && i.repisa === repisa && i.seccion === seccion);
    abrirPanelEstante(idSlot, itemsDelSlot, { estante, repisa, seccion });
    return;
  }

  if (idEstante) {
    const itemsDesdeBD = await obtenerTodos();
    const itemsDelEstante = itemsDesdeBD.filter(i => i.estante === idEstante);
    abrirPanelEstante(idEstante, itemsDelEstante);
    return;
  }

  alert(`QR reconocido pero sin parametros conocidos:\n${textoQR}`);
}

// ============================================
// 23) ESCANER DE UBICACION AL REGISTRAR
// ============================================
function procesarUbicacion(codigo) {
  const match = codigo.trim().match(/^(EST-[A-Z]+-\d+)-R(\d+)-([A-Z])$/);
  if (!match) { alert('Formato invalido.\nDebe ser: EST-IZQ-01-R2-E'); return false; }
  const [, estanteId, repisa, seccion] = match;
  if (!INFO_ESTANTES[estanteId]) { alert(`El estante "${estanteId}" no esta configurado en el sistema.`); return false; }

  document.getElementById('inputEstante').value = estanteId;
  document.getElementById('inputRepisa').value = parseInt(repisa);
  document.getElementById('inputSeccion').value = seccion;
  avisoUbicacion.textContent = `Ubicacion: ${codigo.trim()}`;
  avisoUbicacion.style.display = 'block';
  return true;
}

btnEscanearUbicacion.addEventListener('click', () => {
  callbackEscaner = (textoQR) => {
    try {
      const url = new URL(textoQR);
      const slot = url.searchParams.get('slot');
      const estante = url.searchParams.get('estante');

      if (slot) { procesarUbicacion(slot); return; }
      if (estante) {
        if (!INFO_ESTANTES[estante]) { alert(`El estante "${estante}" no esta configurado.`); return; }
        document.getElementById('inputEstante').value = estante;
        document.getElementById('inputRepisa').value = 0;
        document.getElementById('inputSeccion').value = 'A';
        avisoUbicacion.textContent = `Ubicacion: ${estante} (R0-A por defecto)`;
        avisoUbicacion.style.display = 'block';
        return;
      }
      alert('Este QR no es de un estante o slot');
    } catch {
      procesarUbicacion(textoQR);
    }
  };
  abrirEscanerConCallback();
});

linkUbicacionManual.addEventListener('click', (e) => {
  e.preventDefault();
  const codigo = prompt('Escribe el codigo del slot donde va el item:\nEjemplo: EST-IZQ-01-R2-E');
  if (codigo) procesarUbicacion(codigo);
});

// ============================================
// 24) DETECCION DE QR EN URL AL CARGAR
// ============================================
const params = new URLSearchParams(window.location.search);
const idItemQR = params.get('id');
const idEstanteQR = params.get('estante');
const idSlotQR = params.get('slot');

if (idItemQR) {
  (async () => {
    const item = await buscarItemPorCodigo(idItemQR);
    if (!item) return;
    const objeto = crearObjetoDesdeItem(item);
    resaltarYEnfocar(objeto);
  })();
}

if (idEstanteQR) {
  (async () => {
    const info = INFO_ESTANTES[idEstanteQR];
    if (!info) return;
    const itemsDesdeBD = await obtenerTodos();
    const itemsDelEstante = itemsDesdeBD.filter(i => i.estante === idEstanteQR);
    abrirPanelEstante(idEstanteQR, itemsDelEstante);
  })();
}

if (idSlotQR) {
  (async () => {
    const match = idSlotQR.match(/^(EST-[A-Z]+-\d+)-R(\d+)-([A-Z])$/);
    if (!match) return;
    const estante = match[1], repisa = parseInt(match[2]), seccion = match[3];
    if (!INFO_ESTANTES[estante]) return;
    const itemsDesdeBD = await obtenerTodos();
    const itemsDelSlot = itemsDesdeBD.filter(i => i.estante === estante && i.repisa === repisa && i.seccion === seccion);
    abrirPanelEstante(idSlotQR, itemsDelSlot, { estante, repisa, seccion });
  })();
}
// ============================================
// 25) LOGIN SIMPLE (CONTROL DE ACCESO)
// ============================================
// Usuarios de prueba: admin / admin123  o  empleado / 1234
const USUARIOS = {
  admin:    { pass: 'admin123', rol: 'admin' },
  empleado: { pass: '1234',     rol: 'empleado' }
};

setTimeout(() => {
  // Si ya hay sesión guardada, no mostramos el login
  if (sessionStorage.getItem('inventario_logged') === '1') {
    document.getElementById('loginScreen').style.display = 'none';
    return;
  }

  const formLogin   = document.getElementById('formLogin');
  const loginError  = document.getElementById('loginError');
  const loginScreen = document.getElementById('loginScreen');

  formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const user = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;

    if (USUARIOS[user] && USUARIOS[user].pass === pass) {
      // Exito
      sessionStorage.setItem('inventario_logged', '1');
      sessionStorage.setItem('inventario_user', user);
      sessionStorage.setItem('inventario_rol', USUARIOS[user].rol);

      // Animacion de salida
      loginScreen.style.transition = 'opacity 0.4s, transform 0.4s';
      loginScreen.style.opacity = '0';
      loginScreen.style.transform = 'scale(1.05)';
      setTimeout(() => {
        loginScreen.style.display = 'none';
      }, 400);

      console.log('Sesion iniciada como:', user, '(' + USUARIOS[user].rol + ')');
    } else {
      // Error
      loginError.textContent = 'Usuario o contrasena incorrectos';
      loginError.style.display = 'block';
      document.getElementById('loginPass').value = '';
      document.getElementById('loginPass').focus();
      
      // Shake animation
      formLogin.parentElement.style.animation = 'shake 0.3s';
      setTimeout(() => formLogin.parentElement.style.animation = '', 300);
    }
  });
});

// Animacion de shake para error
const styleShake = document.createElement('style');
styleShake.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`;
document.head.appendChild(styleShake);
// Boton de logout 
const btnLogoutElement = document.getElementById('btnLogout');
if (btnLogoutElement) {
  btnLogoutElement.addEventListener('click', () => {
    if (confirm('Cerrar sesion?')) {
      sessionStorage.clear();
      location.reload();
    }
  });
}
