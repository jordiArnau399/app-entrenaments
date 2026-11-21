import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useApp, useSnapshot } from '../../src/state/store';
import { PageIntro, Screen, syncCopy } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';
import { Button, Card, Field, T, Toggle } from '../../src/ui/ui';

export default function SettingsScreen() {
  const snapshot = useSnapshot();
  const { pending, hub, setOffline, setReminder, syncNow, leave, syncing } = useApp();
  const [time, setTime] = useState(snapshot.settings.reminderTime);
  const [feedback, setFeedback] = useState<string | null>(null);
  const sync = syncCopy(snapshot.settings.offline, pending, hub);
  return (
    <Screen narrow>
      <PageIntro title="Ajustos" detail="El pla i els registres es guarden primer al telèfon." />
      <Card style={{ gap: 8 }}>
        <T variant="label">Sincronització</T>
        <T color={sync.color}>{syncing ? 'S’està sincronitzant…' : sync.label}</T>
        <Toggle label="Simula sense connexió" value={snapshot.settings.offline} onChange={setOffline} />
        <Button label="Sincronitza ara" tone="secondary" disabled={snapshot.settings.offline || syncing} onPress={() => syncNow()} />
      </Card>
      <Card style={{ gap: 10 }}>
        <T variant="label">Recordatori del dia</T>
        <Field label="Hora" value={time} onChangeText={setTime} placeholder="08:00" />
        <Button
          label="Programa el recordatori"
          onPress={() => {
            setReminder(time).then((message) => setFeedback(message));
          }}
        />
        {feedback ? <T color={colors.muted}>{feedback}</T> : null}
        <T variant="small">Al navegador el recordatori no es pot programar. Al telèfon, amb Expo Go, demana permís i avisa cada dia a aquesta hora.</T>
      </Card>
      <Card style={{ gap: 8 }}>
        <T>
          Les dades d'aquesta demostració es queden en aquest aparell. Si has engegat l'app amb npm start, el concentrador local les comparteix amb l'ordinador.
        </T>
        <View>
          <Button
            label="Canvia de perfil"
            tone="secondary"
            onPress={() => {
              leave().then(() => router.replace('/'));
            }}
          />
        </View>
      </Card>
    </Screen>
  );
}
