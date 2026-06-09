import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Toaster, toast } from 'sonner';
import { Music, LogOut, User, Search, PlayCircle, Loader2, Plus, Trash2, Copy, CheckCircle2, ExternalLink } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const SUPABASE_CONFIG_ERROR = !SUPABASE_URL || !SUPABASE_ANON_KEY
  ? 'Faltan variables de entorno de Supabase (VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY).'
  : null;
const supabase = SUPABASE_CONFIG_ERROR ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const SPOTIFY_URL_REGEX = /^https?:\/\/(open\.)?spotify\.com\/(track|album|playlist|episode)\/[A-Za-z0-9]+(?:\?.*)?$/i;

type View = 'landing' | 'auth' | 'dashboard' | 'explore' | 'activate';

function getAuthErrorMessage(rawMessage: string) {
  const message = rawMessage.toLowerCase();
  if (message.includes('email rate limit exceeded') || message.includes('rate limit')) {
    return 'Demasiados intentos. Espera un minuto y vuelve a intentar.';
  }
  if (message.includes('signup is disabled') || message.includes('email signups are disabled')) {
    return 'El registro por correo está deshabilitado en Supabase. Activa "Enable email signups".';
  }
  if (message.includes('invalid login credentials')) {
    return 'No se pudo validar el correo. Revisa que esté bien escrito e inténtalo otra vez.';
  }
  return rawMessage;
}

function App() {
  const [view, setView] = useState<View>('landing');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);

  useEffect(() => {
    if (!supabase) {
      toast.error(SUPABASE_CONFIG_ERROR);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setView('dashboard');
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!supabase || !user?.id) return;

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      setProfile(data);
      const { data: songsData } = await supabase.from('songs').select('*').eq('profile_id', user.id).order('position');
      setSongs(songsData || []);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header user={user} view={view} setView={setView} onLogout={() => supabase?.auth.signOut()} />
      <main>
        {SUPABASE_CONFIG_ERROR && (
          <div className="max-w-2xl mx-auto py-12 px-4">
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2">Configuración incompleta</h2>
              <p>{SUPABASE_CONFIG_ERROR}</p>
            </div>
          </div>
        )}
        {view === 'landing' && <LandingPage onCreate={() => setView('auth')} onExplore={() => setView('explore')} />}
        {view === 'auth' && <AuthForm onCancel={() => setView('landing')} />}
        {view === 'dashboard' && user && <Dashboard userId={user.id} profile={profile} songs={songs} refresh={fetchProfile} />}
        {view === 'explore' && <ExplorePage onBack={() => setView('landing')} />}
        {view === 'activate' && <ActivatePage onBack={() => setView('landing')} />}
      </main>
      <Toaster position="top-center" />
    </div>
  );
}

// ========== COMPONENTES ==========

function Header({ user, view, setView, onLogout }: any) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => setView('landing')} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">Playlist de la <span className="text-emerald-500">Muerte</span></span>
        </button>
        <nav className="flex items-center gap-2">
          <button onClick={() => setView('explore')} className={`px-3 py-2 rounded-md text-sm ${view === 'explore' ? 'bg-zinc-800' : ''}`}>Explorar</button>
          <button onClick={() => setView('activate')} className={`px-3 py-2 rounded-md text-sm ${view === 'activate' ? 'bg-zinc-800' : ''}`}>Activar</button>
          {user ? (
            <>
              <button onClick={() => setView('dashboard')} className={`px-3 py-2 rounded-md text-sm ${view === 'dashboard' ? 'bg-zinc-800' : ''}`}>Mi Playlist</button>
              <button onClick={onLogout} className="px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-red-400">Salir</button>
            </>
          ) : (
            <button onClick={() => setView('auth')} className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-sm">Crear Playlist</button>
          )}
        </nav>
      </div>
    </header>
  );
}

function LandingPage({ onCreate, onExplore }: any) {
  return (
    <div className="py-20 px-4 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8">
        100% Gratis · Para Siempre
      </div>
      <h1 className="text-5xl sm:text-6xl font-bold mb-6">Tu legado <span className="text-emerald-500">musical</span></h1>
      <p className="text-xl text-zinc-400 mb-4">30 canciones. Para siempre.</p>
      <p className="text-zinc-500 mb-12 max-w-xl mx-auto">Crea el playlist que te represente. Edítalo mientras vivas. Al morir, se vuelve público.</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button onClick={onCreate} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold">Crear mi legado</button>
        <button onClick={onExplore} className="px-8 py-4 border border-zinc-700 hover:bg-zinc-800 rounded-lg font-semibold">Explorar legados</button>
      </div>
    </div>
  );
}

function AuthForm({ onCancel }: any) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [lastEmailAttempt, setLastEmailAttempt] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timeout = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);

  const sendMagicLink = async (emailToUse: string, nameToUse: string) => {
    if (!supabase) {
      toast.error('Supabase no está configurado.');
      return false;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOtp({
      email: emailToUse,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
        data: { full_name: nameToUse },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(getAuthErrorMessage(error.message));
      return false;
    }

    const identities = (data?.user as any)?.identities;
    const looksLikeObfuscatedUser = Array.isArray(identities) && identities.length === 0;
    if (looksLikeObfuscatedUser) {
      toast.error('No se pudo crear la cuenta. Activa "Enable email signups" en Supabase Auth.');
      return false;
    }

    setLastEmailAttempt(emailToUse);
    setResendCooldown(60);
    setSent(true);
    toast.success('Solicitud enviada. Revisa tu correo en 1-2 minutos.');
    return true;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!email || !fullName || !accepted) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    if (!normalizedEmail || !normalizedName) {
      toast.error('Completa tu nombre y correo.');
      return;
    }

    await sendMagicLink(normalizedEmail, normalizedName);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !lastEmailAttempt) return;
    const normalizedName = fullName.trim();
    if (!normalizedName) {
      toast.error('Vuelve atrás y agrega tu nombre para reenviar el enlace.');
      setSent(false);
      return;
    }
    await sendMagicLink(lastEmailAttempt, normalizedName);
  };

  if (sent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">¡Revisa tu correo!</h2>
          <p className="text-zinc-400 mb-3">Hemos enviado un enlace mágico a {lastEmailAttempt}</p>
          <p className="text-xs text-zinc-500 mb-6 text-left bg-zinc-800/70 border border-zinc-700 rounded-lg p-3">
            Si no llega en 1-2 minutos, revisa Spam/Promociones y confirma en Supabase Auth que está habilitado Email Provider, SMTP y
            "Enable email signups".
          </p>
          <button
            onClick={handleResend}
            disabled={loading || resendCooldown > 0}
            className="w-full py-3 mb-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg"
          >
            {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : (loading ? 'Enviando...' : 'Reenviar enlace')}
          </button>
          <button onClick={onCancel} className="w-full py-3 border border-zinc-700 rounded-lg">Volver al inicio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        <button type="button" onClick={onCancel} className="text-zinc-400 mb-4">← Volver</button>
        <h2 className="text-2xl font-bold mb-6">Crear tu legado</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Nombre completo (no será público)</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg" required />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
            <span className="text-zinc-400">Entiendo que al morir, mi playlist será público.</span>
          </label>
          <button type="submit" disabled={loading || !accepted} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg font-semibold">
            {loading ? 'Enviando...' : 'Enviar enlace mágico'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Dashboard({ userId, profile, songs, refresh }: any) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [position, setPosition] = useState<number | null>(null);
  const [message, setMessage] = useState(profile?.final_message || '');
  const [copied, setCopied] = useState(false);

  const addSong = async () => {
    if (!supabase) {
      toast.error('Supabase no está configurado.');
      return;
    }

    if (!url || !name || !artist || !position) return;
    if (!SPOTIFY_URL_REGEX.test(url.trim())) {
      toast.error('La URL debe ser un enlace válido de Spotify.');
      return;
    }
    if (position < 1 || position > 30) {
      toast.error('La posición debe estar entre 1 y 30.');
      return;
    }

    const { error } = await supabase.from('songs').insert({
      profile_id: userId,
      position,
      spotify_url: url.trim(),
      song_name: name.trim(),
      artist: artist.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Canción agregada');
      setUrl(''); setName(''); setArtist(''); setPosition(null);
      refresh();
    }
  };

  const deleteSong = async (pos: number) => {
    if (!supabase) return;
    const song = songs.find((s: any) => s.position === pos);
    if (!song) return;
    await supabase.from('songs').delete().eq('id', song.id);
    refresh();
    toast.success('Canción eliminada');
  };

  const saveMessage = async () => {
    if (!supabase) return;
    await supabase.from('profiles').update({ final_message: message }).eq('id', userId);
    toast.success('Mensaje guardado');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(profile.activation_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Código copiado');
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/legado/${profile.id}`)}`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tu Playlist</h1>
          <p className="text-zinc-400">{songs.length}/30 canciones</p>
        </div>
        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm">
          {songs.length === 30 ? '¡Completo!' : `${30 - songs.length} pendientes`}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Agregar canción */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-500" /> Agregar canción</h3>
          <div className="grid sm:grid-cols-4 gap-4 mb-4">
            <select
              value={position || ''}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (!value) {
                  setPosition(null);
                  return;
                }
                setPosition(Math.max(1, Math.min(30, value)));
              }}
              className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg"
            >
              <option value="">Posición</option>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((pos) => {
                const occupied = songs.some((s: any) => s.position === pos);
                return <option key={pos} value={pos} disabled={occupied}>#{pos.toString().padStart(2, '0')} {occupied ? '(ocupada)' : ''}</option>;
              })}
            </select>
            <input type="text" placeholder="URL de Spotify" value={url} onChange={(e) => setUrl(e.target.value)} className="sm:col-span-3 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <input type="text" placeholder="Nombre de la canción" value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg" />
            <input type="text" placeholder="Artista" value={artist} onChange={(e) => setArtist(e.target.value)} className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg" />
          </div>
          <button onClick={addSong} disabled={!position || !url || !name || !artist} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg font-semibold">
            Agregar canción
          </button>
        </div>

        {/* Lista de canciones */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Tus canciones ({songs.length})</h3>
          {songs.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No has agregado canciones aún</p>
          ) : (
            <div className="space-y-2">
              {songs.sort((a: any, b: any) => a.position - b.position).map((song: any) => (
                <div key={song.id} className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
                  <span className="w-8 text-center text-zinc-500 font-mono">{song.position.toString().padStart(2, '0')}</span>
                  <div className="flex-1">
                    <p className="font-medium">{song.song_name}</p>
                    <p className="text-sm text-zinc-400">{song.artist}</p>
                  </div>
                  <a href={song.spotify_url} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-400 hover:text-emerald-400"><ExternalLink className="w-4 h-4" /></a>
                  <button onClick={() => deleteSong(song.position)} className="p-2 text-zinc-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mensaje final */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Mensaje Final</h3>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={4} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg resize-none" placeholder="Escribe algo que quieras que lean quienes escuchen tu playlist..." />
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-zinc-500">{message.length}/500</span>
            <button onClick={saveMessage} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg">Guardar</button>
          </div>
        </div>

        {/* Código y QR */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Código de Activación</h3>
          <div className="flex items-center justify-center gap-4 mb-6">
            <code className="text-3xl font-mono font-bold text-emerald-400 bg-zinc-950 px-6 py-3 rounded-lg">{profile?.activation_code}</code>
            <button onClick={copyCode} className="p-3 border border-zinc-700 rounded-lg hover:bg-zinc-800">{copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}</button>
          </div>
          <div className="text-center">
            <div className="inline-block p-4 bg-white rounded-lg mb-4">
              <img src={qrUrl} alt="QR" className="w-48 h-48" />
            </div>
            <p className="text-sm text-zinc-500">Imprime este QR y déjalo donde te encuentren</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExplorePage({ onBack }: any) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('legados_public').select('*').order('activated_at', { ascending: false });
    if (data) {
      const withSongs = await Promise.all(data.map(async (legado: any) => {
        const { data: songs } = await supabase.from('songs').select('*').eq('profile_id', legado.profile_id).order('position');
        return { legado, songs: songs || [] };
      }));
      setPlaylists(withSongs);
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <button onClick={onBack} className="mb-6 text-zinc-400 hover:text-white">← Volver</button>
      <h1 className="text-3xl font-bold mb-6">Explorar Legados</h1>
      {playlists.length === 0 ? (
        <p className="text-zinc-500 text-center py-12">No hay legados activos aún</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map(({ legado, songs }: any) => (
            <div key={legado.profile_id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 cursor-pointer">
              <div className="inline-block px-3 py-1 bg-zinc-800 rounded-full text-sm mb-2">Legado #{legado.legado_number}</div>
              <p className="text-sm text-zinc-500">{new Date(legado.activated_at).toLocaleDateString('es-ES')}</p>
              <p className="mt-2">{songs.length} canciones</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivatePage({ onBack }: any) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const activate = async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      toast.error('Supabase no está configurado.');
      return;
    }
    if (code.length !== 8) return;
    setLoading(true);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/activate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: code.toUpperCase() }),
    });
    const data = await response.json();
    setLoading(false);
    if (response.ok) {
      setResult(data);
      toast.success('¡Legado activado!');
    } else {
      toast.error(data.error || 'Error al activar');
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <button onClick={() => { setResult(null); setCode(''); }} className="mb-6 text-zinc-400">← Volver</button>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-emerald-400 mb-2">¡Legado Activado!</h2>
          <p>Legado #{result.legado_number}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <button onClick={onBack} className="mb-6 text-zinc-400 hover:text-white">← Volver</button>
      <h1 className="text-3xl font-bold mb-6">Activar Legado</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <p className="text-zinc-400 mb-4">Introduce el código de 8 caracteres</p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="AB12CD34"
          className="w-full px-4 py-4 text-center text-2xl tracking-widest font-mono bg-zinc-800 border border-zinc-700 rounded-lg mb-4 uppercase"
        />
        <button onClick={activate} disabled={loading || code.length !== 8} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg font-semibold">
          {loading ? 'Activando...' : 'Activar Legado'}
        </button>
      </div>
    </div>
  );
}

export default App;
