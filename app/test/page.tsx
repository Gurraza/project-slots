'use client';
import { useState, useEffect } from 'react';



export default function TestPage() {
    const [result, setResult] = useState<string>('Loading...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const testApi = async () => {
            try {
                const res = await fetch("http://192.168.68.101:8080/api/play");
                const data = await res.json();
                // setResult(data.value);
                console.log(data)
            } catch (error) {
                // setError(error)
                console.error(error)
            }
        };

        testApi();
    }, []);

    return (
        <div className='p-6 font-mono'>
            <h1>API Test</h1>
            {/* {error ? (
                <p className='text-red-500'>Error: {error}</p>
            ) : (
                <pre className='bg-white text-black p-2 rounded-xs'>
                    {result}
                </pre>
            )} */}
        </div>
    );
}