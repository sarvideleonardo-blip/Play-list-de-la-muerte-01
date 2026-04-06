import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { colors } from '../constants/colors';
import { supabase } from '../lib/supabase';

// Tipos de datos
type Song = {
  id: string;
  position: number;
  song_name: string;
  artist: string;
};

interface Props {
  userId: string;
  onSongsSaved: (count: number) => void;
}

export function PhotoImportButton({ userId, onSongsSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);

  // 🧠 Lógica para "leer" la foto (Simulación por ahora)
  // En el siguiente paso activaremos la IA real.
  const parsePlaylistText = (text: string): Song[] => {
    // Aquí simulamos que leyó una foto exitosa
    return [
      { id: '1', position: 1, song_name: 'Bohemian Rhapsody', artist: 'Queen' },
      { id: '2', position: 2, song_name: 'Hotel California', artist: 'Eagles' },
      { id: '3', position: 3, song_name: 'Imagine', artist: 'John Lennon' },
      { id: '4', position: 4, song_name: 'Stairway to Heaven', artist: 'Led Zeppelin' }
    ];
  };

  // 📸 Acción principal al tocar el botón
  const pickAndProcess = async () => {
    setLoading(true);
    setModalVisible(true);
    
    try {
      // Simulamos una espera de 1 segundo como si leyera
      await new Promise(res => setTimeout(res, 1000));
      
      const parsed = parsePlaylistText("foto");
      setSongs(parsed);
      
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar.');
      setModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  // 💾 Guardar en la base de datos
  const handleSave = async () => {
    setLoading(true);
    try {
      // Aquí iría la conexión real a Supabase
      // Por ahora, simulamos que se guardó bien
      await new Promise(res => setTimeout(res, 1000));
      
      onSongsSaved(songs.length);
      setModalVisible(false);
      Alert.alert('✅ ¡Guardado!', `Se agregaron ${songs.length} canciones.`);
    } catch (err: any) {
      Alert.alert('Error', 'Falló al guardar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón Principal */}
      <TouchableOpacity style={styles.button} onPress={pickAndProcess} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <>
            <Text style={styles.icon}>📸</Text>
            <Text style={styles.text}>Importar desde Foto</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Modal (Ventana emergente) */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>📝 Revisa las canciones</Text>
            <Text style={styles.subtitle}>Editalas si quieres antes de guardar.</Text>

            <ScrollView style={styles.list}>
              {songs.map((song) => (
                <View key={song.id} style={styles.row}>
                  <Text style={styles.pos}>{song.position}</Text>
                  <View style={styles.inputs}>
                    <TextInput 
                      style={styles.input} 
                      value={song.song_name}
                      placeholderTextColor="#71717a"
                      editable={false} // Deshabilitado en simulación
                    />
                    <TextInput 
                      style={[styles.input, { marginTop: 4 }]} 
                      value={song.artist}
                      placeholderTextColor="#71717a"
                      editable={false}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>💾 Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// 🎨 Estilos (Diseño)
const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', borderRadius: 12, padding: 14, gap: 8 },
  icon: { fontSize: 18 }, text: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fafafa', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#a1a1aa', marginBottom: 16 },
  list: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  pos: { color: '#71717a', fontFamily: 'monospace', fontSize: 14, width: 24, textAlign: 'center', marginTop: 6 },
  inputs: { flex: 1 },
  input: { backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#fafafa' },
  footer: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#27272a' },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#3f3f46' },
  cancelText: { color: '#a1a1aa', fontWeight: '500' },
  saveBtn: { flex: 1.5, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#059669' },
  saveText: { color: '#fff', fontWeight: 'bold' },
});


