import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useRouter } from 'next/router';

const SOCKET_SERVER_URL = 'http://localhost:3000';

export default function Home() {
    const [socket, setSocket] = useState(undefined);
    const [playerName, setPlayerName] = useState('');
    const [gameId, setGameId] = useState('');
    const [showJoinFields, setShowJoinFields] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        //if there is a player id in local storage, then the player has already joined a room
        const storedPlayerId = localStorage.getItem('playerId');
        const storedPlayerName = localStorage.getItem('playerName');
        const storedRoomCode = localStorage.getItem('roomCode');
        if (storedPlayerId && storedPlayerName && storedRoomCode) {
            router.push(`/lobby/${localStorage.getItem('roomCode')}`);
        }
        const newSocket = io(SOCKET_SERVER_URL);
        setSocket(newSocket);

        // Handle room not found error
        newSocket.on('room-not-found', () => {
            setErrorMessage('Room not found. Please check the Game ID.');
        });

        // Move the room-created listener here
        // newSocket.on('room-created', ({ roomCode }) => {
        //     // localStorage.setItem('playerName', 'admin');
        //     // localStorage.setItem('playerId', 'admin');
        //     // localStorage.setItem('roomCode', roomCode);
        //     router.push(`/lobby/${roomCode}`);
        // });

        return () => {
            newSocket.off('room-created'); // Clean up the listener on unmount
            newSocket.close();
        };
    }, []);

    const createRoom = () => {
        // const playerId = localStorage.getItem('playerId');
        router.push(`/host`);
        // socket.emit('create-room');
    };

    const joinRoom = () => {
        const storedPlayerId = localStorage.getItem('playerId');
        if (!storedPlayerId) {
            socket.emit('generate-player-id');
            socket.on('player-id-generated', (playerId) => {
                localStorage.setItem('playerId', playerId);
            });
        }
        
        if (playerName && gameId) {
            const playerId = localStorage.getItem('playerId');
            setErrorMessage(''); // Clear any existing error
            socket.emit('join-room', gameId, playerName, playerId);
            socket.on('player-joined', () => {
                localStorage.setItem('playerName', playerName);
                localStorage.setItem('roomCode', gameId);
                router.push(`/lobby/${gameId}`);
            });
        } else {
            setErrorMessage('Please enter both your name and game ID.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-blue-500 to-purple-500 text-white">
            <h1 className="text-4xl mb-6">Quiplash Game</h1>
            {!showJoinFields ? (
                <>
                    <button
                        onClick={createRoom}
                        className="bg-yellow-400 text-white px-6 py-3 rounded mb-4 hover:bg-yellow-300 transition duration-200"
                    >
                        Host Game
                    </button>
                    <button
                        onClick={() => setShowJoinFields(true)}
                        className="bg-green-400 text-white px-6 py-3 rounded hover:bg-green-300 transition duration-200"
                    >
                        Join Game
                    </button>
                </>
            ) : (
                <div className="flex flex-col items-center">
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="mb-2 p-2 border border-gray-300 rounded bg-white text-black"
                    />
                    <input
                        type="text"
                        placeholder="Enter game ID"
                        value={gameId}
                        onChange={(e) => setGameId(e.target.value.toUpperCase())} // Converts to uppercase
                        className="mb-2 p-2 border border-gray-300 rounded bg-white text-black"
                    />
                    <button
                        onClick={joinRoom}
                        className="bg-green-400 text-white px-6 py-3 rounded hover:bg-green-300 transition duration-200"
                    >
                        Join Game
                    </button>
                    {errorMessage && <p className="text-red-300 mt-4">{errorMessage}</p>}
                </div>
            )}
        </div>
    );
}
