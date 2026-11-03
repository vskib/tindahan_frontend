import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import Modal from './Modal.jsx';
import { Loading } from './Ui.jsx';

const cameraError = (error) => {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return 'Camera access was denied. Allow camera access in your browser settings, then try again.';
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'No camera was found on this device.';
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return 'The camera is already in use. Close other apps using it and try again.';
  }
  return 'Could not start the camera. Check camera permissions and try again.';
};

export default function BarcodeScanner({ onClose, onScan }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);

  onScanRef.current = onScan;

  useEffect(() => {
    let active = true;
    let scanned = false;
    const reader = new BrowserMultiFormatReader();

    const start = async () => {
      try {
        if (!window.isSecureContext) {
          throw new Error('Camera access requires a secure connection (HTTPS).');
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera scanning is not supported by this browser.');
        }
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (!active || !result || scanned) return;
          scanned = true;
          controlsRef.current?.stop();
          onScanRef.current(result.getText());
        });
        if (!active) controls.stop();
        else {
          controlsRef.current = controls;
          setStarting(false);
        }
      } catch (e) {
        if (active) {
          const reason = typeof e?.message === 'string' ? e.message : '';
          setError(reason === 'Camera access requires a secure connection (HTTPS).'
            || reason === 'Camera scanning is not supported by this browser.'
            ? reason
            : cameraError(e));
          setStarting(false);
        }
      }
    };

    start();
    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  return (
    <Modal title="Scan product barcode" onClose={onClose}
      footer={<button className="btn btn-primary" onClick={onClose}>Close</button>}>
      <p className="text-base-content/60">Point the rear camera at a product barcode.</p>
      {starting && !error && <Loading text="Starting camera…" />}
      <video ref={videoRef} className="w-full rounded-md bg-neutral" style={{ maxHeight: '60vh', objectFit: 'cover' }} aria-label="Camera barcode preview" />
      {error && <div className="alert alert-error mt-3 mb-0" role="alert">{error}</div>}
    </Modal>
  );
}
