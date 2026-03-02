"use client"
import Link from 'next/link';

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-50 to-white">
            <h1 className="text-5xl font-bold mb-8 text-blue-900">AI Lecture Assistant</h1>
            <p className="text-xl mb-12 text-gray-600 max-w-2xl text-center">
                Transform your lectures into smart notes, summaries, and quizzes automatically using AI.
            </p>

            <div className="flex gap-4">
                <Link
                    href="/login"
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                    Login
                </Link>
                <Link
                    href="/register"
                    className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
                >
                    Sign Up
                </Link>
            </div>
        </main>
    );
}
