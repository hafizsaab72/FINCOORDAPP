import React, { useState, useCallback } from 'react';
import { colors as staticColors } from '../theme/tokens';
import { View, StyleSheet, Alert, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { Text, Button, ActivityIndicator, TextInput, Surface } from 'react-native-paper';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useAppTheme, useTheme } from '../context/ThemeContext';
import { friendsService } from '../services/friendsService';
import { normalizeCode } from './MyQRCodeScreen';
import { haptics } from '../utils/haptics';

const QR_SCHEME = 'fincoord://add-friend?userId=';

function parseQRValue(value: string): string | null {
  if (value.startsWith(QR_SCHEME)) {
    const id = value.replace(QR_SCHEME, '').trim();
    if (/^[a-f0-9]{24}$/i.test(id)) return id;
  }
  const normalized = normalizeCode(value);
  if (/^[a-f0-9]{24}$/.test(normalized)) return normalized;
  return null;
}

export default function QRScannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { theme } = useAppTheme();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [scanned, setScanned]           = useState(false);
  const [processing, setProcessing]     = useState(false);
  const [status, setStatus]             = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg]       = useState('');
  const [manualVisible, setManualVisible] = useState(false);
  const [manualCode, setManualCode]     = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const handleCode = useCallback(
    async (rawValue: string) => {
      if (scanned || processing) return;

      const userId = parseQRValue(rawValue);
      if (!userId) return;

      setScanned(true);
      setProcessing(true);
      try {
        await friendsService.sendRequest(userId);
        haptics.success();
        setStatus('success');
        setStatusMsg('Friend request sent!');
        setTimeout(() => navigation.goBack(), 1800);
      } catch (e: any) {
        haptics.error();
        setStatus('error');
        setStatusMsg(e.message || 'Could not send friend request.');
      } finally {
        setProcessing(false);
      }
    },
    [scanned, processing, navigation],
  );

  const handleManualSubmit = async () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    const userId = parseQRValue(trimmed);
    if (!userId) {
      Alert.alert('Invalid code', 'Please enter a valid OnTheTab friend code.');
      return;
    }
    setManualLoading(true);
    try {
      await friendsService.sendRequest(userId);
      haptics.success();
      setManualVisible(false);
      setStatus('success');
      setStatusMsg('Friend request sent!');
      setScanned(true);
      setTimeout(() => navigation.goBack(), 1800);
    } catch (e: any) {
      haptics.error();
      Alert.alert('Error', e.message || 'Could not send friend request.');
    } finally {
      setManualLoading(false);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (codes.length > 0 && codes[0].value) {
        handleCode(codes[0].value);
      }
    },
  });

  // Permission not yet determined
  if (!hasPermission) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.permText, { color: theme.text }]}>
          Camera access is required to scan QR codes.
        </Text>
        <Button
          mode="contained"
          onPress={requestPermission}
          style={[styles.permBtn, { backgroundColor: theme.primary }]}
        >
          Allow Camera
        </Button>
        <Button
          mode="outlined"
          onPress={() => setManualVisible(true)}
          style={[styles.permBtn, { marginTop: 8 }]}
        >
          Enter code manually
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 4 }}>
          Go Back
        </Button>
        <ManualCodeModal
          visible={manualVisible}
          value={manualCode}
          loading={manualLoading}
          theme={theme}
          onChange={setManualCode}
          onSubmit={handleManualSubmit}
          onDismiss={() => setManualVisible(false)}
        />
      </View>
    );
  }

  // No rear camera found
  if (!device) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
          No camera device found on this device.
        </Text>
        <Button
          mode="outlined"
          onPress={() => setManualVisible(true)}
          style={[styles.permBtn, { marginTop: 16 }]}
        >
          Enter code manually
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 8 }}>
          Go Back
        </Button>
        <ManualCodeModal
          visible={manualVisible}
          value={manualCode}
          loading={manualLoading}
          theme={theme}
          onChange={setManualCode}
          onSubmit={handleManualSubmit}
          onDismiss={() => setManualVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Live camera feed */}
      <Camera
        device={device}
        isActive={!scanned}
        codeScanner={codeScanner}
        style={StyleSheet.absoluteFill}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top area */}
        <Surface style={styles.topArea} elevation={0}>
          <Text style={styles.instructionText}>
            {scanned ? '' : 'Point at a OnTheTab QR code'}
          </Text>
        </Surface>

        {/* Viewfinder row */}
        <View style={styles.middleRow}>
          <Surface style={styles.sideMask} elevation={0}><></></Surface>
          <View style={styles.viewfinder}>
            {/* Corner marks */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {processing && (
              <ActivityIndicator color={colors.white} size="large" style={styles.scanSpinner} />
            )}
          </View>
          <Surface style={styles.sideMask} elevation={0}><></></Surface>
        </View>

        {/* Bottom area */}
        <Surface style={styles.bottomArea} elevation={0}>
          {status === 'success' && (
            <View style={[styles.statusBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.statusText}>{statusMsg}</Text>
            </View>
          )}
          {status === 'error' && (
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: colors.debt }]}>
                <Text style={styles.statusText}>{statusMsg}</Text>
              </View>
              <Button
                mode="outlined"
                textColor={colors.white}
                style={{ marginTop: 12, borderColor: colors.white }}
                onPress={() => { setScanned(false); setStatus('idle'); setStatusMsg(''); }}
              >
                Try Again
              </Button>
            </View>
          )}
          <Button
            mode="text"
            textColor={colors.white}
            onPress={() => setManualVisible(true)}
            style={{ marginTop: status !== 'idle' ? 8 : 0 }}
          >
            Enter code manually
          </Button>
          <Button
            mode="text"
            textColor="rgba(255,255,255,0.7)"
            onPress={() => navigation.goBack()}
          >
            Cancel
          </Button>
        </Surface>
      </View>

      <ManualCodeModal
        visible={manualVisible}
        value={manualCode}
        loading={manualLoading}
        theme={theme}
        onChange={setManualCode}
        onSubmit={handleManualSubmit}
        onDismiss={() => setManualVisible(false)}
      />
    </View>
  );
}

// ─── Manual code modal ────────────────────────────────────────────────────────

interface ManualModalProps {
  visible: boolean;
  value: string;
  loading: boolean;
  theme: any;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onDismiss: () => void;
}

function ManualCodeModal({ visible, value, loading, theme, onChange, onSubmit, onDismiss }: ManualModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Surface style={[styles.modalCard, { backgroundColor: theme.surface }]} elevation={3}>
          <Text variant="titleMedium" style={{ color: theme.text, marginBottom: 4 }}>
            Enter friend code
          </Text>
          <Text variant="bodySmall" style={{ color: theme.textSecondary, marginBottom: 16 }}>
            Type the 24-character code from your friend's QR code screen.
          </Text>
          <TextInput
            mode="outlined"
            label="Friend code"
            value={value}
            onChangeText={onChange}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. ABC123-DEF456-GHI789-JKL012"
            style={{ marginBottom: 16 }}
          />
          <View style={styles.modalActions}>
            <Button mode="text" onPress={onDismiss} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={onSubmit}
              loading={loading}
              disabled={loading || !value.trim()}
              style={[{ flex: 1 }, { backgroundColor: theme.primary }]}
            >
              Send Request
            </Button>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const VIEWFINDER_SIZE = 240;
const CORNER_SIZE = 22;
const CORNER_BORDER = 4;
const CORNER_COLOR = staticColors.white;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: staticColors.black },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permText: { textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  permBtn: { borderRadius: 10, marginBottom: 4 },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  topArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  instructionText: {
    color: staticColors.white,
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  middleRow: { flexDirection: 'row', height: VIEWFINDER_SIZE },
  sideMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    position: 'relative',
  },
  scanSpinner: { position: 'absolute', top: '50%', left: '50%', marginTop: -16, marginLeft: -16 },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER },
  bottomArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  statusBadgeContainer: { alignItems: 'center' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  statusText: { color: staticColors.white, fontWeight: '600', fontSize: 15 },

  // Manual code modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  modalActions: { flexDirection: 'row', gap: 8 },
});
