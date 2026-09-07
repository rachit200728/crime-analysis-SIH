import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function NetworkBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 260;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Generate points on a sphere
    const NODE_COUNT = 90;
    const RADIUS = 130;
    const points = [];

    for (let i = 0; i < NODE_COUNT; i++) {
      const phi = Math.acos(-1 + (2 * i) / NODE_COUNT);
      const theta = Math.sqrt(NODE_COUNT * Math.PI) * phi;
      const x = RADIUS * Math.cos(theta) * Math.sin(phi);
      const y = RADIUS * Math.sin(theta) * Math.sin(phi);
      const z = RADIUS * Math.cos(phi);
      points.push(new THREE.Vector3(x, y, z));
    }

    const group = new THREE.Group();
    scene.add(group);

    // Nodes
    const nodeGeo = new THREE.SphereGeometry(1.6, 8, 8);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x3ba3ff, transparent: true, opacity: 0.85 });
    points.forEach((p) => {
      const mesh = new THREE.Mesh(nodeGeo, nodeMat);
      mesh.position.copy(p);
      group.add(mesh);
    });

    // Connections (only nearby nodes)
    const lineMat = new THREE.LineBasicMaterial({ color: 0x2c6ea8, transparent: true, opacity: 0.18 });
    const lineGeoPoints = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (points[i].distanceTo(points[j]) < 42) {
          lineGeoPoints.push(points[i], points[j]);
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(lineGeoPoints);
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(lines);

    // Animate
    let frameId;
    const animate = () => {
      group.rotation.y += 0.0018;
      group.rotation.x += 0.0004;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    // Resize handling
    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);
      nodeGeo.dispose();
      nodeMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="network-bg" />;
}