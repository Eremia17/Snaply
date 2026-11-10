import { useCallback, useRef, useState } from 'react';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme';
import { isSupabaseConfigured, supabase } from '../../src/lib/supabase';

type CheckInResult = {
  ticket_id: string;
  event_id: string;
  event_title: string;
  ticket_type_name: string;
  checked_in_at: string;
};

export default function TicketScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(true);
  const [torch, setTorch] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState('');
  const scanLock = useRef(false);

  const handleBarcode = useCallback(async (scan: BarcodeScanningResult) => {
    if (scanLock.current || checking || result) return;
    const token = scan.data.trim();
    if (!/^tm1_[a-f0-9]{64}$/i.test(token)) {
      scanLock.current = true;
      setError('Ce QR code ne correspond pas à un billet Ticket Mada.');
      setCameraActive(false);
      return;
    }
    scanLock.current = true;
    setChecking(true);
    setCameraActive(false);
    setError('');

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Connexion Ticket Mada non configurée.');
      }
      const { data, error: rpcError } = await supabase.rpc('check_in_ticket', {
        p_qr_token: token,
      });
      if (rpcError) throw new Error(rpcError.message || 'Contrôle impossible.');
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.ticket_id || !row?.event_title) {
        throw new Error('Réponse de contrôle invalide. Réessaie.');
      }
      setResult(row as CheckInResult);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Billet non validé.');
    } finally {
      setChecking(false);
    }
  }, [checking, result]);

  const resetScanner = () => {
    scanLock.current = false;
    setResult(null);
    setError('');
    setCameraActive(true);
  };

  if (!permission) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Vérification de la caméra…</Text></View></SafeAreaView>;
  }

  if (!permission.granted) {
    return <SafeAreaView style={styles.safe}>
      <View style={styles.permissionCard}>
        <Text style={styles.eyebrow}>CONTRÔLE D’ACCÈS</Text>
        <Text style={styles.title}>Autoriser la caméra</Text>
        <Text style={styles.muted}>La caméra sert uniquement à lire le QR code présenté à l’entrée. Aucun enregistrement vidéo n’est effectué.</Text>
        <Pressable onPress={requestPermission} style={styles.primary}><Text style={styles.primaryText}>Autoriser la caméra</Text></Pressable>
        <Pressable onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>Retour</Text></Pressable>
      </View>
    </SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>ESPACE ORGANISATEUR</Text><Text style={styles.headerTitle}>Contrôle d’accès</Text></View>
        <Pressable onPress={() => setTorch(value => !value)} style={styles.torch}><Text style={styles.torchText}>{torch ? 'Flash ON' : 'Flash OFF'}</Text></Pressable>
      </View>

      {cameraActive ? <View style={styles.cameraFrame}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          onBarcodeScanned={handleBarcode}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <View pointerEvents="none" style={styles.scanOverlay}>
          <View style={styles.scanCorners}><View style={styles.cornerTL} /><View style={styles.cornerTR} /><View style={styles.cornerBL} /><View style={styles.cornerBR} /></View>
          <Text style={styles.scanHint}>Place le QR code dans le cadre</Text>
        </View>
      </View> : <View style={styles.resultPanel}>
        {checking ? <><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.resultTitle}>Vérification du billet…</Text><Text style={styles.muted}>Le serveur contrôle le paiement, l’événement et l’utilisation précédente.</Text></> :
          result ? <><View style={styles.successMark}><Text style={styles.successMarkText}>✓</Text></View><Text style={styles.successTitle}>ENTRÉE VALIDÉE</Text><Text style={styles.resultTitle}>{result.event_title}</Text><Text style={styles.resultType}>{result.ticket_type_name}</Text><Text style={styles.resultMeta}>Billet {result.ticket_id.slice(0, 8).toUpperCase()}</Text><Text style={styles.successNote}>Ce billet est maintenant marqué comme utilisé. Une deuxième lecture sera refusée.</Text></> :
          <><View style={styles.errorMark}><Text style={styles.errorMarkText}>!</Text></View><Text style={styles.errorTitle}>BILLET NON VALIDÉ</Text><Text style={styles.errorBody}>{error || 'Le contrôle n’a pas abouti.'}</Text></>}
      </View>}

      {cameraActive ? <Text style={styles.bottomHint}>Le contrôle nécessite une connexion internet et un compte organisateur approuvé.</Text> :
        <Pressable onPress={resetScanner} disabled={checking} style={[styles.primary, checking && styles.disabled]}><Text style={styles.primaryText}>Scanner le billet suivant</Text></Pressable>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 25, lineHeight: 28 },
  eyebrow: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 4 },
  torch: { borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  torchText: { color: colors.text, fontSize: 9, fontWeight: '800' },
  cameraFrame: { flex: 1, minHeight: 300, borderRadius: 20, overflow: 'hidden', backgroundColor: '#080A10' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  scanOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  scanCorners: { width: 238, height: 238, position: 'relative' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 34, height: 34, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#FFFFFF', borderTopLeftRadius: 12 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 34, height: 34, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#FFFFFF', borderTopRightRadius: 12 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 34, height: 34, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#FFFFFF', borderBottomLeftRadius: 12 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#FFFFFF', borderBottomRightRadius: 12 },
  scanHint: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', marginTop: 22, textShadowColor: '#000000', textShadowRadius: 5 },
  bottomHint: { color: colors.muted, fontSize: 10, textAlign: 'center', lineHeight: 16, paddingVertical: 14 },
  resultPanel: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', padding: 22, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10 },
  resultTitle: { color: colors.text, fontSize: 19, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  resultType: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  resultMeta: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  successMark: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#245541', alignItems: 'center', justifyContent: 'center' },
  successMarkText: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  successTitle: { color: '#77D8A2', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  successNote: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 8 },
  errorMark: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#58313B', alignItems: 'center', justifyContent: 'center' },
  errorMarkText: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  errorTitle: { color: '#FF9292', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  errorBody: { color: colors.text, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  permissionCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 13 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  primary: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 11, alignItems: 'center', marginTop: 15, width: '100%' },
  primaryText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  secondary: { padding: 10 },
  secondaryText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
