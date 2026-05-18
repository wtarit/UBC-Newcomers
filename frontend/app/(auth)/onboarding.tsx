import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand, Surfaces, Typography, Spacing, Radius } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';
import { api } from '@/services/api';
import { Feather } from '@expo/vector-icons';

function getNameFromIdToken(idToken: string | null): string {
  if (!idToken) return '';
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    return payload.name || '';
  } catch {
    return '';
  }
}

const FACULTIES = [
  'Arts', 'Science', 'Applied Science', 'Commerce', 'Forestry',
  'Land & Food Systems', 'Education', 'Kinesiology', 'Medicine', 'Pharmacy',
];

const INTEREST_OPTIONS = [
  'Coding', 'Hiking', 'Photography', 'Music', 'Art', 'Sports',
  'Cooking', 'Gaming', 'Reading', 'Travel', 'Coffee', 'Yoga',
  'Volunteering', 'Film', 'Dance', 'Science', 'Business', 'Languages',
];

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { fetchUser, idToken } = useAuthStore();
  const fullName = useMemo(() => getNameFromIdToken(idToken), [idToken]);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [faculty, setFaculty] = useState('');
  const [major, setMajor] = useState('');
  const [yearStanding, setYearStanding] = useState<number | null>(null);
  const [origin, setOrigin] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState('');

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 8 ? [...prev, interest] : prev
    );
  };

  const canAdvance = () => {
    switch (step) {
      case 0: return faculty.length > 0;
      case 1: return major.trim().length > 0 && yearStanding !== null;
      case 2: return origin.trim().length > 0;
      case 3: return interests.length >= 3;
      case 4: return true;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.onboarding({
        full_name: fullName,
        faculty,
        major: major.trim(),
        year_standing: yearStanding!,
        origin: origin.trim(),
        interests,
        bio: bio.trim() || undefined,
      });
      await fetchUser();
      router.replace('/(tabs)');
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[s.container, { paddingTop: insets.top + Spacing.md }]}>
        {/* Progress */}
        <View style={s.progressWrap}>
          {step > 0 && (
            <TouchableOpacity onPress={handleBack} style={s.backBtn}>
              <Feather name="arrow-left" size={20} color={Brand.primary} />
            </TouchableOpacity>
          )}
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
          </View>
          <Text style={s.stepLabel}>{step + 1}/{TOTAL_STEPS}</Text>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && <FacultyStep faculty={faculty} setFaculty={setFaculty} />}
          {step === 1 && <ProgramStep major={major} setMajor={setMajor} year={yearStanding} setYear={setYearStanding} />}
          {step === 2 && <OriginStep origin={origin} setOrigin={setOrigin} />}
          {step === 3 && <InterestsStep interests={interests} toggleInterest={toggleInterest} />}
          {step === 4 && <BioStep bio={bio} setBio={setBio} />}
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button
            title={step === TOTAL_STEPS - 1 ? "Let's go!" : 'Continue'}
            variant="primary"
            size="lg"
            onPress={handleNext}
            disabled={!canAdvance()}
            loading={isSubmitting}
            style={{ width: '100%' }}
          />
          {step === TOTAL_STEPS - 1 && (
            <TouchableOpacity onPress={() => { router.replace('/(tabs)'); }} style={s.skipBtn}>
              <Text style={s.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function FacultyStep({ faculty, setFaculty }: { faculty: string; setFaculty: (f: string) => void }) {
  return (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>What faculty are you in?</Text>
      <Text style={s.stepDesc}>This helps us connect you with people in your area</Text>
      <View style={s.optionsGrid}>
        {FACULTIES.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFaculty(f)}
            style={[s.optionChip, faculty === f && s.optionChipSelected]}
          >
            <Text style={[s.optionText, faculty === f && s.optionTextSelected]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ProgramStep({ major, setMajor, year, setYear }: {
  major: string; setMajor: (m: string) => void;
  year: number | null; setYear: (y: number) => void;
}) {
  return (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Tell us about your program</Text>
      <Text style={s.stepDesc}>What are you studying and how far along?</Text>

      <View style={s.field}>
        <Text style={s.label}>Major / Program</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Computer Science"
          placeholderTextColor={Brand.secondary}
          value={major}
          onChangeText={setMajor}
          autoCapitalize="words"
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Year Standing</Text>
        <View style={s.yearRow}>
          {[1, 2, 3, 4, 5].map(y => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              style={[s.yearBtn, year === y && s.yearBtnSelected]}
            >
              <Text style={[s.yearText, year === y && s.yearTextSelected]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

function OriginStep({ origin, setOrigin }: { origin: string; setOrigin: (o: string) => void }) {
  return (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Where are you from?</Text>
      <Text style={s.stepDesc}>Help us match you with people from similar backgrounds or who want to learn about your culture</Text>

      <View style={s.field}>
        <Text style={s.label}>Country / City</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Vancouver, Canada"
          placeholderTextColor={Brand.secondary}
          value={origin}
          onChangeText={setOrigin}
          autoCapitalize="words"
        />
      </View>
    </View>
  );
}

function InterestsStep({ interests, toggleInterest }: {
  interests: string[]; toggleInterest: (i: string) => void;
}) {
  return (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>What are you into?</Text>
      <Text style={s.stepDesc}>Pick at least 3 interests (max 8). We use these for AI-powered matching.</Text>

      <View style={s.optionsGrid}>
        {INTEREST_OPTIONS.map(i => (
          <TouchableOpacity
            key={i}
            onPress={() => toggleInterest(i)}
            style={[s.optionChip, interests.includes(i) && s.optionChipSelected]}
          >
            <Text style={[s.optionText, interests.includes(i) && s.optionTextSelected]}>{i}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.counter}>{interests.length}/8 selected</Text>
    </View>
  );
}

function BioStep({ bio, setBio }: { bio: string; setBio: (b: string) => void }) {
  return (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Write a short bio</Text>
      <Text style={s.stepDesc}>A sentence or two about yourself. What would you want others to know?</Text>

      <TextInput
        style={s.textArea}
        placeholder="e.g. CS major who loves hiking and building apps. Looking for study buddies and adventure partners!"
        placeholderTextColor={Brand.secondary}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={200}
        textAlignVertical="top"
      />
      <Text style={s.charCount}>{bio.length}/200</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Surfaces.background },
  container: { flex: 1, backgroundColor: Surfaces.background, paddingHorizontal: Spacing.lg },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  progressBar: { flex: 1, height: 4, backgroundColor: Surfaces.default, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: Brand.accent, borderRadius: 2 },
  stepLabel: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.secondary },
  scroll: { flexGrow: 1, paddingBottom: 120 },
  stepContent: { gap: Spacing.lg },
  stepTitle: { fontFamily: Typography.fonts.h1, fontSize: 24, color: Brand.primary },
  stepDesc: { fontFamily: Typography.fonts.body, fontSize: 15, color: Brand.secondary, lineHeight: 22 },
  field: { gap: 6 },
  label: { fontFamily: Typography.fonts.h4, fontSize: 13, color: Brand.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    fontFamily: Typography.fonts.body, fontSize: 16, color: Brand.primary,
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    borderRadius: Radius.md, paddingHorizontal: 16, height: 48,
  },
  textArea: {
    fontFamily: Typography.fonts.body, fontSize: 16, color: Brand.primary,
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    borderRadius: Radius.md, padding: 16, height: 120,
  },
  charCount: { fontFamily: Typography.fonts.caption, fontSize: 12, color: Brand.secondary, textAlign: 'right' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full,
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
  },
  optionChipSelected: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  optionText: { fontFamily: Typography.fonts.h4, fontSize: 14, color: Brand.primary },
  optionTextSelected: { color: '#FFFFFF' },
  yearRow: { flexDirection: 'row', gap: 12 },
  yearBtn: {
    width: 48, height: 48, borderRadius: Radius.full,
    backgroundColor: Surfaces.default, borderWidth: 1, borderColor: Surfaces.border,
    alignItems: 'center', justifyContent: 'center',
  },
  yearBtnSelected: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  yearText: { fontFamily: Typography.fonts.h3, fontSize: 18, color: Brand.primary },
  yearTextSelected: { color: '#FFFFFF' },
  counter: { fontFamily: Typography.fonts.caption, fontSize: 13, color: Brand.secondary },
  footer: { paddingTop: Spacing.md, gap: Spacing.sm, alignItems: 'center' },
  skipBtn: { marginTop: Spacing.xs },
  skipText: { fontFamily: Typography.fonts.body, fontSize: 14, color: Brand.secondary },
});
