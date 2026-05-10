import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Share,
  Clipboard,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Surface,
  Divider,
  Snackbar,
  TouchableRipple,
  SegmentedButtons,
} from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { haptics } from '../utils/haptics';

const QR_SCHEME = 'fincoord://add-friend?userId=';

/** Format a 24-char hex ID as groups of 6 for readability: ABCDEF-GHIJKL-... */
const formatCode = (id: string) =>
  id.toUpperCase().match(/.{1,6}/g)?.join('-') ?? id.toUpperCase();

/** Strip dashes and lowercase — reverse of formatCode */
export const normalizeCode = (raw: string) =>
  raw.replace(/-/g, '').toLowerCase().trim();

export default function MyQRCodeScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const currentUser = useStore(state => state.currentUser);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [segment, setSegment] = useState<'my-code' | 'scan'>('my-code');

  if (!currentUser) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 16 }}>
          Sign in to see your QR code.
        </Text>
      </View>
    );
  }

  const userId = currentUser.id;
  const qrValue = `${QR_SCHEME}${userId}`;
  const friendCode = formatCode(userId);

  const showSnack = (msg: string) => {
    setSnackMsg(msg);
    setSnackVisible(true);
  };

  const copyCode = () => {
    haptics.medium();
    Clipboard.setString(friendCode);
    showSnack('Friend code copied!');
  };

  const shareCode = () => {
    haptics.medium();
    Share.share({
      message: `Add me on FinCoord! My friend code: ${friendCode}\nOr open: ${qrValue}`,
      title: 'My FinCoord Friend Code',
    });
  };

  const copyLink = () => {
    haptics.medium();
    Clipboard.setString(qrValue);
    showSnack('Link copied!');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Scan / My code toggle */}
      <View style={styles.toggleWrap}>
        <SegmentedButtons
          value={segment}
          onValueChange={v => {
            if (v === 'scan') {
              haptics.selection();
              navigation.navigate('QRScanner');
            } else {
              haptics.selection();
              setSegment(v as 'my-code' | 'scan');
            }
          }}
          buttons={[
            { value: 'scan', label: 'Scan' },
            { value: 'my-code', label: 'My code' },
          ]}
          style={styles.toggle}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Avatar — overlaps the card */}
        <View style={styles.avatarWrap}>
          {currentUser.profilePic ? (
            <Image
              source={{ uri: currentUser.profilePic }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                { backgroundColor: theme.primary },
              ]}>
              <Text variant="headlineMedium" style={{ color: '#FFF' }}>
                {(currentUser.name?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Green branded card */}
        <Surface
          style={[
            styles.card,
            { backgroundColor: theme.primary },
          ]}
          elevation={2}>
          <Text
            variant="titleLarge"
            style={[styles.name, { color: '#FFF' }]}>
            {currentUser.name}
          </Text>

          {/* White QR container */}
          <Surface
            style={styles.qrWrap}
            elevation={0}>
            <QRCode
              value={qrValue}
              size={200}
              color="#1E1E1E"
              backgroundColor="#FFFFFF"
              logo={undefined}
              ecl="M"
            />
          </Surface>
        </Surface>

        {/* Friend code link */}
        <TouchableRipple onPress={copyLink} style={styles.linkRipple}>
          <Text
            variant="bodyMedium"
            style={[styles.link, { color: theme.primary }]}>
            {qrValue}
          </Text>
        </TouchableRipple>

        {/* Action rows */}
        <View style={[styles.actions, { backgroundColor: theme.surface }]}>
          <TouchableRipple onPress={shareCode}>
            <View style={styles.actionRow}>
              <Text variant="bodyLarge" style={{ color: theme.text }}>
                Share code
              </Text>
            </View>
          </TouchableRipple>
          <Divider style={{ backgroundColor: theme.border }} />
          <TouchableRipple onPress={copyCode}>
            <View style={styles.actionRow}>
              <Text variant="bodyLarge" style={{ color: theme.text }}>
                Copy code
              </Text>
            </View>
          </TouchableRipple>
        </View>

        {/* Disclaimer */}
        <Text
          variant="bodySmall"
          style={[styles.disclaimer, { color: theme.textSecondary }]}>
          Anyone can use your code to add you on FinCoord. Only share it with people you trust.
        </Text>
      </ScrollView>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2000}>
        {snackMsg}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  toggleWrap: { width: '100%', alignItems: 'center', marginBottom: 8 },
  toggle: { width: 220 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
  },
  avatarWrap: {
    marginBottom: -36,
    zIndex: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 24,
    paddingTop: 44,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  name: {
    fontWeight: '700',
    marginBottom: 20,
  },
  qrWrap: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRipple: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  link: {
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  actions: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
    overflow: 'hidden',
  },
  actionRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
});
