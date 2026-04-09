import { DropdownPicker } from "@/src/components/DropdownPicker";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useGitaData } from "@/src/hooks/useGitaData";
import { useSettings } from "@/src/hooks/useSettings";
import {
  cancelAllNotifications,
  requestNotificationPermission,
  scheduleDailyNotification,
} from "@/src/notifications/scheduler";
import { useTheme } from "@/src/theme";
import {
  TRANSLATION_KEYS,
  TRANSLATION_LABELS,
  type AppTheme,
  type BrowseScrollMode,
  type PreferredLanguage,
} from "@/src/types";
import { exportUserData, importUserData } from "@/src/utils/importExport";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TEXT_SIZE_STEPS = [0.85, 1.0, 1.15, 1.3];
const TEXT_SIZE_LABELS = ["Small", "Normal", "Large", "XL"];
function textSizeLabel(val: number): string {
  const idx = TEXT_SIZE_STEPS.findIndex((s) => Math.abs(s - val) < 0.01);
  return TEXT_SIZE_LABELS[idx] ?? "Normal";
}

function timeStringToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeString(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function SettingsScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, loaded, updateSetting } = useSettings();
  const { data } = useGitaData();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sequential start picker state
  const [startChapter, setStartChapter] = useState(1);
  const [startVerse, setStartVerse] = useState(1);
  const [startInitialized, setStartInitialized] = useState(false);

  useEffect(() => {
    if (!loaded || !data || startInitialized) return;
    const total = data.flat_verses.length;
    const nextIdx = ((settings.last_verse_index as number) + 1) % total;
    const ref = data.flat_verses[nextIdx];
    if (ref) {
      setStartChapter(ref.chapter);
      setStartVerse(ref.verse);
    }
    setStartInitialized(true);
  }, [loaded, data, settings.last_verse_index, startInitialized]);

  const handleStartChapterChange = (ch: number) => {
    setStartChapter(ch);
    setStartVerse(1);
  };

  const applySequentialStart = useCallback(async () => {
    if (!data) return;
    const flatIdx = data.flat_verses.findIndex(
      (f) => f.chapter === startChapter && f.verse === startVerse,
    );
    if (flatIdx < 0) return;
    const prevIdx =
      (flatIdx - 1 + data.flat_verses.length) % data.flat_verses.length;
    await updateSetting("last_verse_index", prevIdx);
    await updateSetting("last_verse_date", "");
    Alert.alert(
      "Updated",
      `Daily shlok will restart from BG ${startChapter}.${startVerse}`,
    );
  }, [data, startChapter, startVerse, updateSetting]);

  // Text size stepper
  const textSizeIdx = TEXT_SIZE_STEPS.findIndex(
    (s) => Math.abs(s - settings.text_size) < 0.01,
  );
  const canDecreaseText = textSizeIdx > 0;
  const canIncreaseText = textSizeIdx < TEXT_SIZE_STEPS.length - 1;
  const decreaseTextSize = () => {
    if (canDecreaseText)
      updateSetting("text_size", TEXT_SIZE_STEPS[textSizeIdx - 1]);
  };
  const increaseTextSize = () => {
    if (canIncreaseText)
      updateSetting("text_size", TEXT_SIZE_STEPS[textSizeIdx + 1]);
  };

  const handleNotificationToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Enable notifications in your device settings to receive daily shloks.",
          );
          return;
        }
        await updateSetting("notifications_enabled", true);
        await scheduleDailyNotification(settings.notification_time);
      } else {
        await updateSetting("notifications_enabled", false);
        await cancelAllNotifications();
      }
    },
    [settings.notification_time, updateSetting],
  );

  const handleTimeChange = useCallback(
    async (_event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === "android") setShowTimePicker(false);
      if (!date) return;
      const timeStr = dateToTimeString(date);
      await updateSetting("notification_time", timeStr);
      if (settings.notifications_enabled) {
        await scheduleDailyNotification(timeStr);
      }
    },
    [settings.notifications_enabled, updateSetting],
  );

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      await exportUserData();
    } catch (e: any) {
      Alert.alert("Export Failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    setLoading(true);
    try {
      const result = await importUserData();
      Alert.alert(
        result.success ? "Import Successful" : "Import Failed",
        result.message,
      );
    } catch (e: any) {
      Alert.alert("Import Failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader showBack title="Settings" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Daily Shlok */}
        <Text style={[styles.sectionTitle, { color: c.accent }]}>
          Daily Shlok
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.cardBorder },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Ionicons name="shuffle-outline" size={18} color={c.primary} />
              <View>
                <Text style={[styles.label, { color: c.text }]}>
                  Verse Order
                </Text>
                <Text style={[styles.sublabel, { color: c.textMuted }]}>
                  {settings.verse_order === "sequential"
                    ? "In order (Ch 1 onward)"
                    : "Random each day"}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.verse_order === "random"}
              onValueChange={(v) =>
                updateSetting("verse_order", v ? "random" : "sequential")
              }
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {Platform.OS !== "web" && (
            <>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <View style={styles.row}>
                <View style={styles.rowLabel}>
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color={c.primary}
                  />
                  <Text style={[styles.label, { color: c.text }]}>
                    Daily Reminder
                  </Text>
                </View>
                <Switch
                  value={settings.notifications_enabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: c.border, true: c.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {settings.notifications_enabled && (
                <>
                  <View
                    style={[styles.divider, { backgroundColor: c.border }]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    style={styles.row}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowLabel}>
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={c.primary}
                      />
                      <View>
                        <Text style={[styles.label, { color: c.text }]}>
                          Reminder Time
                        </Text>
                        <Text style={[styles.sublabel, { color: c.textMuted }]}>
                          {settings.notification_time}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={c.textMuted}
                    />
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

        {showTimePicker &&
          Platform.OS !== "web" &&
          (Platform.OS === "ios" ? (
            <Modal transparent animationType="slide">
              <View style={styles.pickerBackdrop}>
                <View
                  style={[
                    styles.pickerContainer,
                    { backgroundColor: c.surface },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    style={styles.pickerDone}
                  >
                    <Text style={[styles.pickerDoneText, { color: c.primary }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                  <DateTimePicker
                    value={timeStringToDate(settings.notification_time)}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    textColor={c.primary}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={timeStringToDate(settings.notification_time)}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          ))}

        {/* Sequential start — only shown when in-order mode */}
        {settings.verse_order === "sequential" && data && (
          <>
            <Text style={[styles.sectionTitle, { color: c.accent }]}>
              Start From
            </Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: c.surface,
                  borderColor: c.cardBorder,
                  padding: 16,
                  gap: 12,
                },
              ]}
            >
              <Text style={[styles.sublabel, { color: c.textMuted }]}>
                Choose the shlok to begin from. Takes effect on next daily
                update.
              </Text>
              <View style={styles.startPickerRow}>
                <View style={styles.startPickerCol}>
                  <Text
                    style={[styles.startPickerLabel, { color: c.textMuted }]}
                  >
                    Chapter
                  </Text>
                  <DropdownPicker<string>
                    value={String(startChapter)}
                    options={data.chapters.map((ch) => ({
                      value: String(ch.chapter),
                      label: `Ch ${ch.chapter}`,
                    }))}
                    onChange={(v) => handleStartChapterChange(Number(v))}
                  />
                </View>
                <View style={styles.startPickerCol}>
                  <Text
                    style={[styles.startPickerLabel, { color: c.textMuted }]}
                  >
                    Verse
                  </Text>
                  <DropdownPicker<string>
                    value={String(startVerse)}
                    options={Array.from(
                      {
                        length:
                          data.chapters.find((c) => c.chapter === startChapter)
                            ?.verse_count ?? 1,
                      },
                      (_, i) => ({
                        value: String(i + 1),
                        label: `Verse ${i + 1}`,
                      }),
                    )}
                    onChange={(v) => setStartVerse(Number(v))}
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={applySequentialStart}
                style={[styles.applyBtn, { backgroundColor: c.primary }]}
                activeOpacity={0.8}
              >
                <Text style={styles.applyBtnText}>
                  Set BG {startChapter}.{startVerse} as start
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Reading */}
        <Text style={[styles.sectionTitle, { color: c.accent }]}>Reading</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.cardBorder,
              padding: 16,
            },
          ]}
        >
          <DropdownPicker<BrowseScrollMode>
            label="Chapter Swipe Direction"
            value={settings.browse_scroll_mode}
            options={[
              { value: "list", label: "Vertical" },
              { value: "pager", label: "Horizontal" },
            ]}
            onChange={(v) => updateSetting("browse_scroll_mode", v)}
          />
        </View>

        {/* Text Size */}
        <Text style={[styles.sectionTitle, { color: c.accent }]}>
          Text Size
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.cardBorder },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Ionicons name="text-outline" size={18} color={c.primary} />
              <Text style={[styles.label, { color: c.text }]}>
                {textSizeLabel(settings.text_size)}
              </Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={decreaseTextSize}
                disabled={!canDecreaseText}
                style={[
                  styles.stepBtn,
                  {
                    borderColor: c.border,
                    opacity: canDecreaseText ? 1 : 0.35,
                  },
                ]}
              >
                <Text style={[styles.stepBtnText, { color: c.primary }]}>
                  A−
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={increaseTextSize}
                disabled={!canIncreaseText}
                style={[
                  styles.stepBtn,
                  {
                    borderColor: c.border,
                    opacity: canIncreaseText ? 1 : 0.35,
                  },
                ]}
              >
                <Text style={[styles.stepBtnText, { color: c.primary }]}>
                  A+
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Language */}
        <Text style={[styles.sectionTitle, { color: c.accent }]}>
          Preferred Language
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.cardBorder,
              padding: 16,
            },
          ]}
        >
          <DropdownPicker<PreferredLanguage>
            label="Script shown first"
            value={settings.preferred_language}
            options={[
              { value: "english", label: "English" },
              { value: "sanskrit", label: "Sanskrit" },
            ]}
            onChange={(v) => updateSetting("preferred_language", v)}
          />
        </View>

        {/* Translation */}
        <Text style={[styles.sectionTitle, { color: c.accent }]}>
          Default Translation
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.cardBorder,
              padding: 16,
            },
          ]}
        >
          <DropdownPicker
            value={settings.preferred_translation}
            options={TRANSLATION_KEYS.map((k) => ({
              value: k,
              label: TRANSLATION_LABELS[k],
            }))}
            onChange={(v) => updateSetting("preferred_translation", v)}
          />
        </View>

        {/* Theme */}
        <Text style={[styles.sectionTitle, { color: c.accent }]}>Theme</Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.cardBorder,
              padding: 16,
            },
          ]}
        >
          <DropdownPicker<AppTheme>
            label="Appearance"
            value={settings.theme}
            options={[
              { value: "system", label: "System Default" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={(v) => updateSetting("theme", v)}
          />
        </View>

        {/* Data */}
        <Text style={[styles.sectionTitle, { color: c.accent }]}>Data</Text>

        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.cardBorder },
          ]}
        >
          <Text
            style={[
              styles.aboutBody,
              { color: c.textMuted, paddingHorizontal: 16, paddingTop: 14 },
            ]}
          >
            Your favorites, notes, and preferences are stored only on this
            device. Nothing is uploaded or shared.
          </Text>
          <View
            style={[
              styles.divider,
              { backgroundColor: c.border, marginTop: 14 },
            ]}
          />
          <TouchableOpacity
            onPress={handleExport}
            style={styles.row}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabel}>
              <Ionicons name="download-outline" size={18} color={c.primary} />
              <View>
                <Text style={[styles.label, { color: c.text }]}>
                  Export Data
                </Text>
                <Text style={[styles.sublabel, { color: c.textMuted }]}>
                  Save favorites & notes to a file
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <TouchableOpacity
            onPress={handleImport}
            style={styles.row}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={styles.rowLabel}>
              <Ionicons
                name="cloud-upload-outline"
                size={18}
                color={c.primary}
              />
              <View>
                <Text style={[styles.label, { color: c.text }]}>
                  Import Data
                </Text>
                <Text style={[styles.sublabel, { color: c.textMuted }]}>
                  Restore from a backup file
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: c.accent }]}>About</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.cardBorder,
              padding: 16,
              gap: 12,
            },
          ]}
        >
          <Text style={[styles.aboutTitle, { color: c.text }]}>
            Pocket Gita
          </Text>
          <Text style={[styles.aboutBody, { color: c.textMuted }]}>
            A free, open-source app for reading and reflecting on the Bhagavad
            Gita. No ads. No account required.
          </Text>

          <View
            style={[
              styles.divider,
              {
                backgroundColor: c.border,
                marginHorizontal: 0,
                marginVertical: 4,
              },
            ]}
          />

          <Text style={[styles.creditHeading, { color: c.textSecondary }]}>
            Content Sources
          </Text>
          <Text style={[styles.aboutBody, { color: c.textMuted }]}>
            Gita text and translations sourced from the VedicScriptures Bhagavad
            Gita dataset (LGPL-3.0).
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 4,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  label: { fontSize: 15, fontWeight: "500" },
  sublabel: { fontSize: 12, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  aboutTitle: { fontSize: 16, fontWeight: "700" },
  aboutBody: { fontSize: 13, lineHeight: 19 },
  creditHeading: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  creditRow: { gap: 1 },
  creditName: { fontSize: 13, fontWeight: "500" },
  creditOrg: { fontSize: 12 },
  startPickerRow: { flexDirection: "row", gap: 12 },
  startPickerCol: { flex: 1, gap: 4 },
  startPickerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  applyBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  applyBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  stepper: { flexDirection: "row", gap: 8 },
  stepBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepBtnText: { fontSize: 14, fontWeight: "700" },
  pickerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  pickerContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  pickerDone: { alignItems: "flex-end", padding: 16 },
  pickerDoneText: { fontSize: 16, fontWeight: "700" },
});
