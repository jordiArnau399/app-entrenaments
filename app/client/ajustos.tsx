import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApp, useSnapshot } from '../../src/state/store';
import { useLang } from '../../src/ui/language';
import { PageIntro, Screen, syncCopy } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';
import { Button, Card, Field, Pill, T, Toggle } from '../../src/ui/ui';

export default function SettingsScreen() {
  const snapshot = useSnapshot();
  const { pending, hub, setOffline, setReminder, syncNow, leave, signOutAccount, syncing, setLanguage } = useApp();
  const lang = useLang();
  const [time, setTime] = useState(snapshot.settings.reminderTime);
  const [feedback, setFeedback] = useState<string | null>(null);
  const sync = syncCopy(snapshot.settings.offline, pending, hub);
  return (
    <Screen narrow>
      <PageIntro title="Ajustos" detail="El pla i els registres es guarden primer al telèfon." />
      <Card style={{ gap: 8 }}>
        <T variant="label">Llengua</T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {(['ca', 'es', 'en'] as const).map((code) => (
            <Pressable key={code} onPress={() => setLanguage(code)}>
              <Pill label={code === 'ca' ? 'Català' : code === 'es' ? 'Español' : 'English'} tone={lang === code ? 'accent' : 'neutral'} />
            </Pressable>
          ))}
        </View>
      </Card>
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
          {snapshot.settings.mode === 'account'
            ? 'El pla es desa en aquest aparell i es sincronitza amb el teu compte quan hi ha connexió.'
            : 'Les dades d\'aquesta demostració es queden en aquest aparell. Si has engegat l\'app amb npm start, el concentrador local les comparteix amb l\'ordinador.'}
        </T>
        <View>
          <Button
            label={snapshot.settings.mode === 'account' ? 'Tanca la sessió' : 'Canvia de perfil'}
            tone="secondary"
            onPress={() => {
              const leaveApp = snapshot.settings.mode === 'account' ? signOutAccount : leave;
              leaveApp().then(() => router.replace('/'));
            }}
          />
        </View>
      </Card>
    </Screen>
  );
}
