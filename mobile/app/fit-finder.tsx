import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { useApp } from '../lib/context/AppContext';
import { getProductRecommendation, isPositiveRecommendation } from '../lib/utils/fitEngine';

const HEIGHT_OPTIONS = ["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6+"];
const BODY_TYPES     = ['Athletic', 'Lean', 'Broad', 'Heavy'] as const;
const OCCASIONS      = ['Office', 'College', 'Casual', 'Travel', 'Vacation', 'Wedding', 'Date Night', 'Festive', 'Gym'];
const CATEGORIES     = ['T-Shirts', 'Shirts', 'Trousers', 'Jeans', 'Ethnic Wear', 'Activewear', 'Jackets', 'Footwear'];
const BUDGETS        = ['Under ₹500', '₹500–₹1,500', '₹1,500–₹5,000', '₹5,000+'];

type Step = {
  key: string;
  title: string;
  subtitle: string;
  options: string[];
  multi: boolean;
};

const STEPS: Step[] = [
  { key: 'height',    title: "What's your height?", subtitle: 'We filter fits exclusively for you.',  options: HEIGHT_OPTIONS, multi: false },
  { key: 'bodyType',  title: 'Your body type?',     subtitle: 'Helps us fine-tune proportions.',       options: BODY_TYPES as unknown as string[], multi: false },
  { key: 'occasions', title: 'What occasions?',     subtitle: 'Select all that apply.',                options: OCCASIONS,      multi: true  },
  { key: 'cats',      title: 'Categories you love', subtitle: 'We\'ll prioritise these.',              options: CATEGORIES,     multi: true  },
  { key: 'budget',    title: 'Budget range?',        subtitle: 'For personalised price filtering.',    options: BUDGETS,        multi: false },
];

export default function FitFinderScreen() {
  const { height: ctxHeight, bodyType: ctxBodyType, setHeight, setBodyType } = useApp();

  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({
    height:   ctxHeight,
    bodyType: ctxBodyType,
    occasions:[],
    cats:     [],
    budget:   '',
  });

  const current = STEPS[step];

  const toggle = (key: string, option: string, multi: boolean) => {
    setAnswers(prev => {
      if (!multi) return { ...prev, [key]: option };
      const arr = (prev[key] as string[]) ?? [];
      return { ...prev, [key]: arr.includes(option) ? arr.filter(o => o !== option) : [...arr, option] };
    });
  };

  const isSelected = (key: string, option: string, multi: boolean) => {
    if (!multi) return answers[key] === option;
    return (answers[key] as string[])?.includes(option);
  };

  const canAdvance = () => {
    const val = answers[current.key];
    if (!current.multi) return !!val;
    return Array.isArray(val) && val.length > 0;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      // Apply profile choices
      setHeight(answers.height as string);
      setBodyType(answers.bodyType as any);
      // Navigate to search with filters pre-applied
      router.replace('/(tabs)/search');
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>

      {/* Back + progress */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => step === 0 ? router.back() : setStep(s => s - 1)}
            className="w-10 h-10 bg-[#112133]/5 rounded-full items-center justify-center">
            <ArrowLeft size={18} color="#112133" />
          </Pressable>
          <Text className="text-[10px] font-black uppercase tracking-widest text-[#112133]/40">
            {step + 1} / {STEPS.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View className="h-1 bg-[#112133]/10 rounded-full overflow-hidden">
          <MotiView
            animate={{ width: `${progress}%` }}
            transition={{ type: 'timing', duration: 300 }}
            className="h-full bg-[#FFD43B] rounded-full"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Question */}
        <MotiView
          key={step}
          from={{ opacity: 0, translateX: 30 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 250 }}
          className="px-5 pt-6 pb-4"
        >
          <Text className="text-3xl font-black text-[#112133] leading-tight mb-1">{current.title}</Text>
          <Text className="text-sm text-[#112133]/50 font-medium">{current.subtitle}</Text>
        </MotiView>

        {/* Options */}
        <MotiView
          key={`opts-${step}`}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 300, delay: 100 }}
          className="px-5 flex-row flex-wrap gap-3 pb-8"
        >
          {current.options.map(opt => {
            const active = isSelected(current.key, opt, current.multi);
            return (
              <Pressable
                key={opt}
                onPress={() => toggle(current.key, opt, current.multi)}
                className={`flex-row items-center gap-2 px-5 py-3.5 rounded-xl border-2 ${
                  active
                    ? 'bg-[#0F0F10] border-[#FFD43B]'
                    : 'bg-[#F9F8F6] border-transparent'
                }`}
              >
                {active && <Check size={14} color="#FFD43B" />}
                <Text className={`text-sm font-black uppercase tracking-wide ${active ? 'text-white' : 'text-[#112133]/70'}`}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </MotiView>
      </ScrollView>

      {/* Footer CTA */}
      <View className="px-5 py-4 border-t border-black/5">
        <Pressable
          onPress={handleNext}
          disabled={!canAdvance()}
          className={`py-4 rounded-xl flex-row items-center justify-center gap-2 ${canAdvance() ? 'bg-[#FFD43B]' : 'bg-[#112133]/10'}`}
        >
          <Text className={`font-black text-sm uppercase tracking-wider ${canAdvance() ? 'text-black' : 'text-[#112133]/30'}`}>
            {step === STEPS.length - 1 ? 'Find My Fits' : 'Next'}
          </Text>
          {canAdvance() && <ArrowRight size={16} color="#000" />}
        </Pressable>
      </View>

    </SafeAreaView>
  );
}
