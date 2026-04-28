import React, { useState } from 'react';
import { View, StyleSheet, Share, Clipboard } from 'react-native';
import { Text, Button, Surface, Divider, Snackbar } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';

const QR_SCHEME = 'fincoord://add-friend?userId=';

/** Format a 24-char hex ID as groups of 6 for readability: ABCDEF-GHIJKL-... */
const formatCode = (id: string) =>
  id.toUpperCase().match(/.{1,6}/g)?.join('-') ?? id.toUpperCase();

/** Strip dashes and lowercase — reverse of formatCode */
export const normalizeCode = (raw: string) =>
  raw.replace(/-/g, '').toLowerCase().trim();

export default function MyQRCodeScreen({ navigation }: any) {
  const { theme, isDark } = useAppTheme();
  const currentUser = useStore(state => state.currentUser);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  if (!currentUser) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 16 }}>
          Sign in to see your QR code.
        </Text>
        <Button mode="contained" onPress={() => navigation.navigate('SignIn')}
          style={{ backgroundColor: theme.primary }}>
          Sign In
        </Button>
      </View>
    );
  }

  const userId = currentUser.id;
  const qrValue = `${QR_SCHEME}${userId}`;
  const friendCode = formatCode(userId);

  const copyCode = () => {
    Clipboard.setString(friendCode);
    setSnackMsg('Friend code copied!');
    setSnackVisible(true);
  };

  const shareCode = () => {
    Share.share({
      message: `Add me on FinCoord! My friend code: ${friendCode}\nOr open: ${qrValue}`,
      title: 'My FinCoord Friend Code',
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text variant="titleMedium" style={[styles.title, { color: theme.text }]}>
          {currentUser.name}
        </Text>
        <Text variant="bodySmall" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Others can scan this QR or type your friend code to add you.
        </Text>

        {/* QR Code */}
        <Surface
          style={[styles.qrCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          elevation={0}
        >
          <QRCode
            value={qrValue}
            size={220}
            color={isDark ? '#F5F5F5' : '#1E1E1E'}
            backgroundColor={isDark ? '#1A1A1A' : '#FFFFFF'}
            logo={undefined}
            ecl="M"
          />
        </Surface>

        <Divider style={styles.divider} />

        {/* Friend Code */}
        <Text variant="labelMedium" style={[styles.codeLabel, { color: theme.textSecondary }]}>
          FRIEND CODE
        </Text>
        <Surface
          style={[styles.codeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          elevation={0}
        >
          <Text
            variant="headlineSmall"
            style={[styles.codeText, { color: theme.text }]}
            selectable
          >
            {friendCode}
          </Text>
        </Surface>

        <View style={styles.btnRow}>
          <Button
            mode="outlined"
            icon="content-copy"
            onPress={copyCode}
            style={styles.btn}
          >
            Copy Code
          </Button>
          <Button
            mode="contained"
            icon="share-variant"
            onPress={shareCode}
            style={[styles.btn, { backgroundColor: theme.primary }]}
          >
            Share
          </Button>
        </View>
      </View>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2000}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  content: { flex: 1, alignItems: 'center', padding: 24 },
  title: { fontWeight: '700', marginBottom: 6 },
  subtitle: { textAlign: 'center', marginBottom: 28, lineHeight: 18 },
  qrCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { width: '80%', marginVertical: 24 },
  codeLabel: { fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  codeBox: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: 'center',
  },
  codeText: { fontWeight: 'bold', letterSpacing: 3, fontFamily: 'monospace' },
  btnRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderRadius: 10 },
});
