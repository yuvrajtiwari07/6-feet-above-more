import React from 'react';
import { View, Pressable } from 'react-native';
import { LayoutGrid, Grid2x2, Square } from 'lucide-react-native';
import { useApp } from '../../lib/context/AppContext';

export const GridDensitySelector: React.FC = () => {
  const { cardSize, setCardSize } = useApp();

  const options: { value: 'small' | 'medium' | 'large'; icon: React.ReactNode }[] = [
    { value: 'small',  icon: <LayoutGrid size={15} color={cardSize === 'small'  ? '#7D2AE8' : '#112133'} /> },
    { value: 'medium', icon: <Grid2x2   size={15} color={cardSize === 'medium' ? '#7D2AE8' : '#112133'} /> },
    { value: 'large',  icon: <Square    size={15} color={cardSize === 'large'  ? '#7D2AE8' : '#112133'} /> },
  ];

  return (
    <View className="flex-row items-center gap-1 bg-[#112133]/5 rounded-xl p-1">
      {options.map(({ value, icon }) => (
        <Pressable
          key={value}
          onPress={() => setCardSize(value)}
          className={`p-2 rounded-lg ${cardSize === value ? 'bg-white shadow-sm' : ''}`}
        >
          {icon}
        </Pressable>
      ))}
    </View>
  );
};
