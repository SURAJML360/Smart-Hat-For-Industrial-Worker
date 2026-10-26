import { useEffect, useRef, useState } from 'react';
import { useSocketCtx } from '../context/SocketContext';

/**
 * Subscribe to a specific socket event.
 * Returns the latest payload received for that event.
 */
export default function useSocket(eventName) {
  const { socket } = useSocketCtx();
  const [data, setData] = useState(null);
  const eventRef = useRef(eventName);
  eventRef.current = eventName;

  useEffect(() => {
    if (!socket || !eventName) return;

    const handler = (payload) => setData(payload);
    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, eventName]);

  return data;
}
