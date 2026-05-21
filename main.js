// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

/* ==========================================================================
   CUSTOM CURSOR PHYSICS
   ========================================================================== */
const cursor = document.getElementById('custom-cursor');
const cursorDot = document.getElementById('custom-cursor-dot');
let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;
let dotX = 0, dotY = 0;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Smooth cursor follow interpolation
function animateCursor() {
    // Lerp cursor body (slightly slower for drag effect)
    cursorX += (mouseX - cursorX) * 0.1;
    cursorY += (mouseY - cursorY) * 0.1;
    
    // Lerp cursor dot (faster for responsiveness)
    dotX += (mouseX - dotX) * 0.25;
    dotY += (mouseY - dotY) * 0.25;
    
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;
    
    cursorDot.style.left = `${dotX}px`;
    cursorDot.style.top = `${dotY}px`;
    
    requestAnimationFrame(animateCursor);
}
animateCursor();

// Mouse hover effects
const hoverTargets = document.querySelectorAll('.hover-target, a, button, input, textarea, .scroll-prompt');
hoverTargets.forEach(target => {
    target.addEventListener('mouseenter', () => {
        cursor.classList.add('hovered');
        gsap.to(cursorDot, { scale: 2, backgroundColor: '#8b5cf6', duration: 0.2 });
    });
    
    target.addEventListener('mouseleave', () => {
        cursor.classList.remove('hovered');
        gsap.to(cursorDot, { scale: 1, backgroundColor: '#d946ef', duration: 0.2 });
    });
});

/* ==========================================================================
   THREE.JS 3D WEBGL GRAPHICS
   ========================================================================== */
let scene, camera, renderer;
let particleSystem, mainMesh, innerPointsMesh;
let targetX = 0, targetY = 0;
let scrollProgress = 0;

const canvas = document.getElementById('webgl-canvas');

function initThree() {
    // 1. Scene & Setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.05);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Ambient Particles System (Dust / Stars)
    const particleCount = 1200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorPalette = [
        new THREE.Color(0x8b5cf6), // Violet
        new THREE.Color(0x3b82f6), // Blue
        new THREE.Color(0xd946ef)  // Pink
    ];

    for (let i = 0; i < particleCount * 3; i += 3) {
        // Random box distribution
        positions[i] = (Math.random() - 0.5) * 35;
        positions[i + 1] = (Math.random() - 0.5) * 25;
        positions[i + 2] = (Math.random() - 0.5) * 20;

        // Color variation
        const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i] = randomColor.r;
        colors[i + 1] = randomColor.g;
        colors[i + 2] = randomColor.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create custom particle shader/material
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });

    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // 3. Central Morphing Geometric Sphere (Icosahedron)
    const baseRadius = 2.0;
    const meshGeometry = new THREE.IcosahedronGeometry(baseRadius, 4);
    
    // Save original vertex positions for mathematical morphing calculations
    meshGeometry.userData = {
        originalPositions: meshGeometry.attributes.position.clone()
    };

    const meshMaterial = new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        wireframe: true,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending
    });

    mainMesh = new THREE.Mesh(meshGeometry, meshMaterial);
    scene.add(mainMesh);

    // 4. Inner Sphere Points (Secondary Layer)
    const innerPointsGeometry = new THREE.IcosahedronGeometry(1.9, 3);
    const innerPointsMaterial = new THREE.PointsMaterial({
        color: 0xd946ef,
        size: 0.05,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    innerPointsMesh = new THREE.Points(innerPointsGeometry, innerPointsMaterial);
    scene.add(innerPointsMesh);

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 2, 50);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Initial update call
    animateThree();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// Tracking mouse position for 3D reactivity
window.addEventListener('mousemove', (e) => {
    targetX = (e.clientX - window.innerWidth / 2) * 0.0003;
    targetY = (e.clientY - window.innerHeight / 2) * 0.0003;
});

// Vertex Morphing Logic
function morphGeometry(time) {
    const geometry = mainMesh.geometry;
    const positionAttribute = geometry.attributes.position;
    const originalPositions = geometry.userData.originalPositions;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
        // Read original position
        vertex.fromBufferAttribute(originalPositions, i);
        
        // Apply complex trigonometric noise displacement based on time & coordinate position
        const noiseX = Math.sin(vertex.x * 2.0 + time * 1.5) * 0.25;
        const noiseY = Math.cos(vertex.y * 2.0 + time * 1.5) * 0.25;
        const noiseZ = Math.sin(vertex.z * 2.0 + time * 1.5) * 0.25;
        
        // Push vertex outward along its normal
        const displacement = noiseX + noiseY + noiseZ;
        const length = vertex.length();
        vertex.normalize().multiplyScalar(length + displacement);
        
        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positionAttribute.needsUpdate = true;
}

// Three.js Render/Animation Loop
let clock = new THREE.Clock();

function animateThree() {
    const elapsedTime = clock.getElapsedTime();

    // Ambient rotations
    if (particleSystem) {
        particleSystem.rotation.y = elapsedTime * 0.015;
    }

    if (mainMesh && innerPointsMesh) {
        // Base rotational speed
        mainMesh.rotation.y = elapsedTime * 0.06;
        mainMesh.rotation.x = elapsedTime * 0.04;
        
        innerPointsMesh.rotation.y = -elapsedTime * 0.08;
        innerPointsMesh.rotation.x = -elapsedTime * 0.05;

        // Modify 3D meshes to look toward cursor (Lerp for smoothness)
        mainMesh.rotation.y += (targetX - mainMesh.rotation.y) * 0.1;
        mainMesh.rotation.x += (targetY - mainMesh.rotation.x) * 0.1;
        
        innerPointsMesh.rotation.y += (-targetX - innerPointsMesh.rotation.y) * 0.1;
        innerPointsMesh.rotation.x += (-targetY - innerPointsMesh.rotation.x) * 0.1;

        // Perform mathematical vertex displacement (3D morphing)
        morphGeometry(elapsedTime);
    }

    // Dynamic camera response
    camera.position.x += (targetX * 2 - camera.position.x) * 0.05;
    camera.position.y += (-targetY * 2 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
    requestAnimationFrame(animateThree);
}

// Start Three.js when libraries load
window.addEventListener('load', () => {
    initThree();
    
    // Simulate loading progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 20) + 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            document.getElementById('loader-bar').style.width = '100%';
            document.getElementById('loader-status').innerText = 'System Ready';
            
            // Exit Loading Screen & Reveal Page
            setTimeout(() => {
                const tl = gsap.timeline();
                tl.to('#loader', {
                    yPercent: -100,
                    duration: 1.2,
                    ease: 'power4.inOut',
                    onComplete: () => {
                        document.getElementById('loader').style.display = 'none';
                    }
                });
                
                // Play Hero Animations
                tl.from('.reveal-text', {
                    y: 60,
                    opacity: 0,
                    duration: 1,
                    stagger: 0.15,
                    ease: 'power4.out'
                }, '-=0.4');
                
                tl.from('.header', {
                    y: -50,
                    opacity: 0,
                    duration: 1,
                    ease: 'power3.out'
                }, '-=0.8');
            }, 500);
        } else {
            document.getElementById('loader-bar').style.width = `${progress}%`;
        }
    }, 150);
});


/* ==========================================================================
   GSAP SCROLLTRIGGER & PARALLAX STORYTELLING
   ========================================================================== */

// 1. Scroll Progress Bar
gsap.to('#scroll-progress-bar', {
    width: '100%',
    ease: 'none',
    scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3
    }
});

// 2. Active Nav Link Tracking based on Scroll
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-link');

sections.forEach(section => {
    ScrollTrigger.create({
        trigger: section,
        start: 'top 40%',
        end: 'bottom 40%',
        onEnter: () => updateNavActive(section.id),
        onEnterBack: () => updateNavActive(section.id)
    });
});

function updateNavActive(id) {
    navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// 3. Three.js Mesh Coordinates & Scale morphing on scroll
// Section 1 (Hero) to Section 2 (Story)
gsap.timeline({
    scrollTrigger: {
        trigger: '#story',
        start: 'top bottom',
        end: 'top center',
        scrub: 1
    }
})
.to(mainMesh.position, { x: -2.2, y: 0.2, z: 1.0 })
.to(innerPointsMesh.position, { x: -2.2, y: 0.2, z: 1.0 }, '<')
.to(mainMesh.scale, { x: 1.2, y: 1.2, z: 1.2 }, '<')
.to(innerPointsMesh.scale, { x: 1.2, y: 1.2, z: 1.2 }, '<');

// Section 2 (Story) to Section 3 (Skills)
gsap.timeline({
    scrollTrigger: {
        trigger: '#skills',
        start: 'top bottom',
        end: 'top center',
        scrub: 1
    }
})
.to(mainMesh.position, { x: 2.2, y: -0.2, z: 0.5 })
.to(innerPointsMesh.position, { x: 2.2, y: -0.2, z: 0.5 }, '<')
.to(mainMesh.scale, { x: 1.3, y: 1.3, z: 1.3 }, '<')
.to(innerPointsMesh.scale, { x: 1.3, y: 1.3, z: 1.3 }, '<')
.to(mainMesh.material, { opacity: 0.4 }, '<');

// Section 3 (Skills) to Section 4 (Projects)
gsap.timeline({
    scrollTrigger: {
        trigger: '#projects',
        start: 'top bottom',
        end: 'top center',
        scrub: 1
    }
})
.to(mainMesh.position, { x: 0, y: -1.0, z: -2.0 })
.to(innerPointsMesh.position, { x: 0, y: -1.0, z: -2.0 }, '<')
.to(mainMesh.scale, { x: 2.2, y: 2.2, z: 2.2 }, '<')
.to(innerPointsMesh.scale, { x: 2.2, y: 2.2, z: 2.2 }, '<')
.to(mainMesh.material, { opacity: 0.12 }, '<');

// Section 4 (Projects) to Section 5 (Contact)
gsap.timeline({
    scrollTrigger: {
        trigger: '#contact',
        start: 'top bottom',
        end: 'top center',
        scrub: 1
    }
})
.to(mainMesh.position, { x: 0, y: 0.5, z: 2.0 })
.to(innerPointsMesh.position, { x: 0, y: 0.5, z: 2.0 }, '<')
.to(mainMesh.scale, { x: 1.0, y: 1.0, z: 1.0 }, '<')
.to(innerPointsMesh.scale, { x: 1.0, y: 1.0, z: 1.0 }, '<')
.to(mainMesh.material, { opacity: 0.35 }, '<');

// 4. Parallax Scroll Effect on Skill Cards
document.querySelectorAll('.parallax-card').forEach(card => {
    const speed = parseFloat(card.getAttribute('data-speed')) || 0;
    gsap.fromTo(card, {
        y: 100 * speed
    }, {
        y: -100 * speed,
        ease: 'none',
        scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
        }
    });
});

// 5. Scroll Reveals for Paragraphs & Projects
document.querySelectorAll('.scroll-reveal-p').forEach((p, idx) => {
    gsap.from(p, {
        opacity: 0.1,
        y: 30,
        duration: 1,
        scrollTrigger: {
            trigger: p,
            start: 'top 85%',
            end: 'top 60%',
            scrub: 1
        }
    });
});

document.querySelectorAll('.scroll-reveal-project').forEach(project => {
    gsap.from(project, {
        opacity: 0,
        y: 100,
        duration: 1,
        scrollTrigger: {
            trigger: project,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
        }
    });
});

/* ==========================================================================
   INTERACTIVE MOUSE TILT (3D CARD EFFECT)
   ========================================================================== */
const tiltCards = document.querySelectorAll('.skill-card, .project-image-container');

tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; // x coordinate inside element
        const y = e.clientY - rect.top;  // y coordinate inside element
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate tilt percentages
        const rotateX = ((centerY - y) / centerY) * 10; // Max 10 degrees tilt
        const rotateY = ((x - centerX) / centerX) * 10;
        
        gsap.to(card, {
            rotateX: rotateX,
            rotateY: rotateY,
            transformPerspective: 1000,
            scale: 1.02,
            boxShadow: '0 30px 60px rgba(139, 92, 246, 0.15)',
            duration: 0.3,
            ease: 'power2.out'
        });
    });
    
    card.addEventListener('mouseleave', () => {
        gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            duration: 0.5,
            ease: 'power2.out'
        });
    });
});

// Smooth anchor scroll click
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            gsap.to(window, {
                duration: 1.2,
                scrollTo: { y: targetElement, offsetY: 0 },
                ease: 'power3.inOut'
            });
        }
    });
});
