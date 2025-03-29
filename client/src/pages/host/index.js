import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3000';

export default function Lobby() {
    const [socket, setSocket] = useState(undefined);
    const [players, setPlayers] = useState([]);
    const [leaderId, setLeaderId] = useState(null);
    const [roomCode, setRoomCode] = useState('');
    const router = useRouter();

    useEffect(() => {
        const newSocket = io(SOCKET_SERVER_URL);
        setSocket(newSocket);

        setRoomCode(roomCode);


        // Create the room, if the room code is already in local storage, do nothing
        const storedRoomCode = localStorage.getItem('roomCode');

        if (storedRoomCode) {
            newSocket.emit('rejoin-room', storedRoomCode);
        }
        else {
            //create a new room, store the room code in local storage and join the room
            newSocket.emit('create-room');
            newSocket.on('room-created', ({ roomCode }) => {
                localStorage.setItem('roomCode', roomCode);
                setRoomCode(roomCode);
                newSocket.emit('rejoin-room', roomCode);
            });
        }

    

        newSocket.on('player-joined', (data) => {
            console.log('player-joined');
            if (data && data.players && data.leader !== undefined) {
                setPlayers(data.players);
                setLeaderId(data.leader);
            }
        });

        newSocket.on('player-left', (data) => {
            if (data && data.players && data.leader !== undefined) {
                setPlayers(data.players);
                setLeaderId(data.leader);
            }
        });

        newSocket.on('room-not-found', () => {
            // Redirect to homepage if room does not exist
            //clear local gameID onlh and redirect to homepage
            localStorage.removeItem('roomCode');
            router.push('/');
        });

        return () => {
            newSocket.close();
        };
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-purple-500 to-blue-500 text-black">
            <h1 className="text-3xl text-white mb-4">Lobby for Room Code: {roomCode}</h1>
            <ul>
                {players && players.map(player => (
                    console.log(player.id),
                    <li key={player.id} className="text-white mb-2">
                        {player.name} {player.id === leaderId && <span>⭐</span>}
                    </li>
                ))}
            </ul>
            <button
            //clear local gameID onlh and redirect to homepage on click
                onClick={() => {
                    localStorage.removeItem('roomCode');
                    router.push('/');
                }}
                className="bg-red-400 text-white px-4 py-2 rounded mt-4 hover:bg-red-300 transition duration-200"
            >
                Leave Game
            </button>
        </div>
    );
}
