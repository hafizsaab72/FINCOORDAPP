import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Switch,
} from 'react-native';
import { Text, TextInput, ActivityIndicator, Icon } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupsService } from '../services/groupsService';
import { GROUP_TYPES, GroupTypeConfig } from '../constants/groupTypes';

/** Auto-inserts '-' after 4th and 7th character while typing a date. */
function autoFormatDate(raw: string, prev: string): string {
  if (raw.length < prev.length) return raw;
  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.length > 8) digits = digits.slice(0, 8);
  if (digits.length > 4) digits = `${digits.slice(0, 4)}-${digits.slice(4)}`;
  if (digits.length > 7) digits = `${digits.slice(0, 7)}-${digits.slice(7)}`;
  return digits;
}

export default function CustomizeGroupScreen({ route, navigation }: any) {
  const { groupId, groupName, groupType, groupStartDate, groupEndDate } = route.params ?? {};
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const updateGroup = useStore(state => state.updateGroup);

  const [name, setName]               = useState<string>(groupName ?? '');
  const [selectedType, setSelectedType] = useState<string>(groupType ?? 'other');
  const [tripDatesEnabled, setTripDatesEnabled] = useState(
    !!(groupStartDate || groupEndDate),
  );
  const [startDate, setStartDate]     = useState<string>(groupStartDate ?? '');
  const [endDate, setEndDate]         = useState<string>(groupEndDate ?? '');
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);

  const isLocal = !groupId?.match(/^[a-f\d]{24}$/i);

  const handlePickPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.5,
      });
      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.uri) setImageUri(asset.uri);
      if (asset.base64) setImageBase64(`data:image/jpeg;base64,${asset.base64}`);
    } catch {
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  const handleDone = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Name required', 'Group name must be at least 2 characters.');
      return;
    }

    const patch: any = {
      name: name.trim(),
      type: selectedType as any,
      startDate: tripDatesEnabled ? startDate || undefined : undefined,
      endDate: tripDatesEnabled ? endDate || undefined : undefined,
      ...(imageBase64 ? { image: imageBase64 } : {}),
    };

    if (isLocal) {
      updateGroup(groupId, patch);
      navigation.goBack();
      return;
    }

    setSaving(true);
    try {
      const apiPatch: any = {
        name: patch.name,
        type: patch.type,
        startDate: tripDatesEnabled ? startDate || null : null,
        endDate: tripDatesEnabled ? endDate || null : null,
        ...(imageBase64 ? { image: imageBase64 } : {}),
      };
      const data = await groupsService.update(groupId, apiPatch);
      updateGroup(groupId, {
        name: data.group.name,
        type: data.group.type as any,
        startDate: data.group.startDate,
        endDate: data.group.endDate,
        ...(data.group.image ? { image: data.group.image } : {}),
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Custom header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon source="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text variant="titleMedium" style={[styles.headerTitle, { color: theme.text }]}>
          Customize group
        </Text>
        <TouchableOpacity onPress={handleDone} style={styles.headerBtn} disabled={saving}>
          {saving
            ? <ActivityIndicator size={18} color={theme.primary} />
            : <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 16 }}>Done</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Photo picker + Name row */}
        <View style={styles.photoNameRow}>
          <TouchableOpacity
            style={[styles.photoPicker, { borderColor: theme.border }]}
            onPress={handlePickPhoto}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photoPreview} />
            ) : (
              <Icon source="camera-plus" size={28} color="#888" />
            )}
          </TouchableOpacity>

          <View style={styles.nameCol}>
            <Text variant="bodySmall" style={{ color: theme.textSecondary, marginBottom: 4 }}>
              Group name
            </Text>
            <TextInput
              mode="flat"
              value={name}
              onChangeText={setName}
              underlineColor="transparent"
              activeUnderlineColor={theme.primary}
              style={[styles.nameInput, { backgroundColor: 'transparent', color: theme.text }]}
              textColor={theme.text}
              autoCapitalize="words"
              dense
            />
          </View>
        </View>

        {/* Type selector */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Type</Text>
        <View style={styles.typeGrid}>
          {GROUP_TYPES.map((t: GroupTypeConfig) => {
            const selected = selectedType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.typeCard,
                  { borderColor: selected ? theme.primary : theme.border, backgroundColor: theme.surface },
                  selected && { backgroundColor: theme.primary + '14' },
                ]}
                onPress={() => setSelectedType(t.key)}
              >
                <Icon source={t.icon} size={28} color={selected ? theme.primary : theme.textSecondary} />
                <Text
                  variant="labelMedium"
                  style={{
                    color: selected ? theme.primary : theme.text,
                    marginTop: 8,
                    fontWeight: selected ? '700' : '500',
                  }}
                >
                  {t.label}
                </Text>
                {/* Downward pointer for selected */}
                {selected && (
                  <View style={[styles.typePointer, { borderTopColor: theme.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Trip dates toggle */}
        <View style={styles.tripDatesSection}>
          <View style={styles.tripDatesHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>
                Trip dates
              </Text>
              <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
                When on, we'll remind friends to join, add expenses, and settle up based on dates you set.
              </Text>
            </View>
            <Switch
              value={tripDatesEnabled}
              onValueChange={setTripDatesEnabled}
              trackColor={{ true: theme.primary, false: '#CCC' }}
              thumbColor="#FFF"
            />
          </View>

          {tripDatesEnabled && (
            <View style={styles.datesRow}>
              <View style={styles.dateField}>
                <Text variant="labelSmall" style={{ color: theme.textSecondary, marginBottom: 4 }}>
                  Start
                </Text>
                <View style={[styles.dateInputWrap, { borderBottomColor: theme.border }]}>
                  <TextInput
                    mode="flat"
                    placeholder="15 Apr 2026"
                    value={startDate}
                    onChangeText={text => setStartDate(autoFormatDate(text, startDate))}
                    style={[styles.dateInput, { backgroundColor: 'transparent' }]}
                    textColor={theme.text}
                    placeholderTextColor="#CCC"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    keyboardType="numbers-and-punctuation"
                    dense
                  />
                  <Icon source="calendar" size={20} color={theme.textSecondary} />
                </View>
              </View>
              <View style={styles.dateField}>
                <Text variant="labelSmall" style={{ color: theme.textSecondary, marginBottom: 4 }}>
                  End
                </Text>
                <View style={[styles.dateInputWrap, { borderBottomColor: theme.border }]}>
                  <TextInput
                    mode="flat"
                    placeholder="22 Apr 2026"
                    value={endDate}
                    onChangeText={text => setEndDate(autoFormatDate(text, endDate))}
                    style={[styles.dateInput, { backgroundColor: 'transparent' }]}
                    textColor={theme.text}
                    placeholderTextColor="#CCC"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    keyboardType="numbers-and-punctuation"
                    dense
                  />
                  <Icon source="calendar" size={20} color={theme.textSecondary} />
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4, minWidth: 60 },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '600' },
  body: { padding: 20, gap: 20 },

  photoNameRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoPicker: {
    width: 80, height: 80, borderRadius: 16,
    borderWidth: 2, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: 80, height: 80, borderRadius: 16 },
  nameCol: { flex: 1 },
  nameInput: { fontSize: 18, paddingHorizontal: 0, height: 48 },

  sectionLabel: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  typeGrid: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    borderRadius: 14, borderWidth: 1.5,
    position: 'relative',
  },
  typePointer: {
    position: 'absolute',
    bottom: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },

  tripDatesSection: { marginTop: 8 },
  tripDatesHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  datesRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  dateField: { flex: 1 },
  dateInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, paddingBottom: 4,
  },
  dateInput: { flex: 1, fontSize: 16, paddingHorizontal: 0, height: 40 },
});
