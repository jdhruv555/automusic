import TalkButton from '@/components/TalkButton';
import SignalChain from '../components/SignalChain';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white space-y-6">
      <h1 className="text-3xl font-bold">Soundverse Voice Assistant</h1>
      
      {/* 🗣️ Talk Button */}
      <TalkButton />

      {/* 🎛️ Visual Signal Chain */}
      <div className="w-full mt-10 px-4" style={{ height: 300 }}>
        <h2 className="text-xl mb-2">Signal Chain</h2>
        <SignalChain isActive={false} />
      </div>
    </main>
  );
}
