import { router } from 'expo-router';
import { View } from 'react-native';
import { colors } from '../src/ui/theme';
import { Button, T } from '../src/ui/ui';

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <T variant="title">Aquesta pàgina no existeix</T>
      <Button label="Torna a l'inici" onPress={() => router.replace('/')} />
    </View>
  );
}
