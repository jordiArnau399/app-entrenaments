import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { WEEKDAYS_CA } from '../../../src/domain/dates';
import { useSnapshot } from '../../../src/state/store';
import { PageIntro, Screen } from '../../../src/ui/shell';
import { colors } from '../../../src/ui/theme';
import { Button, Card, T } from '../../../src/ui/ui';

export default function TemplatesScreen() {
  const snapshot = useSnapshot();
  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <PageIntro eyebrow="Reutilitzables" title="Plantilles" detail="Assignar-ne una en fa una còpia. Si després la canvies, els plans ja donats no es mouen." />
        <Button label="Nova plantilla" onPress={() => router.push('/entrenador/plantilles/nova')} />
      </View>
      <View style={{ gap: 12 }}>
        {snapshot.templates.map((template) => (
          <Pressable key={template.id} accessibilityRole="button" onPress={() => router.push(`/entrenador/plantilles/${template.id}`)}>
            <Card style={{ gap: 6 }}>
              <T variant="section">{template.name}</T>
              <T color={colors.muted}>{template.description}</T>
              <T variant="small">
                {template.days
                  .slice()
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((day) => `${WEEKDAYS_CA[day.weekday]} · ${day.name}`)
                  .join('   ')}
              </T>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
