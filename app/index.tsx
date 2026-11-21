import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clientReport } from '../src/domain/report';
import { greeting, todayIso } from '../src/domain/dates';
import { useApp } from '../src/state/store';
import { Boot } from '../src/ui/shell';
import { colors, font } from '../src/ui/theme';
import { Button, Card, Field, Mark, Notice, Pill, T } from '../src/ui/ui';

export default function EntryScreen() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  const { ready, error, snapshot, enterTrainer, enterClient, resetDemo, accounts } = app;
  if (error) return <Boot message={error} />;
  if (!ready || !snapshot) return <Boot />;
  if (accounts && snapshot.settings.mode !== 'account') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, paddingTop: insets.top + 36, paddingBottom: insets.bottom + 36 }}>
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: 16 }}>
          <Mark size={52} />
          <T variant="display">Ritme</T>
          <Notice message={app.notice} />
          <AuthPanel />
        </View>
      </ScrollView>
    );
  }
  if (accounts && snapshot.settings.role) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }}>
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: 12 }}>
          <T variant="title">Hola, {snapshot.trainers[0]?.name ?? snapshot.clients[0]?.name}</T>
          <Button
            label={snapshot.settings.role === 'trainer' ? 'Continua com a entrenador' : 'Continua amb el teu pla'}
            onPress={() => router.replace(snapshot.settings.role === 'trainer' ? '/entrenador' : '/client')}
          />
          <Button label="Tanca la sessió" tone="secondary" onPress={() => { app.signOutAccount().then(() => router.replace('/')); }} />
        </View>
      </ScrollView>
    );
  }
  const today = todayIso();
  const trainer = snapshot.trainers[0];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, paddingTop: insets.top + 36, paddingBottom: insets.bottom + 36 }}>
      <View style={{ width: '100%', maxWidth: 1080, alignSelf: 'center', gap: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <View style={{ flexGrow: 1, flexBasis: 360, minWidth: 280, gap: 14 }}>
          <Mark size={52} />
          <T variant="display">Ritme</T>
          <T color={colors.muted} style={{ fontSize: 18, lineHeight: 26 }}>
            Plans, sessions i resultats. L'entrenador prepara el pla; el client l'anota, també sense cobertura.
          </T>
          <T variant="small">Mode demostració, sense compte. Les dades es guarden en aquest aparell.</T>
        </View>
        <View style={{ flexGrow: 1, flexBasis: 380, minWidth: 280, gap: 12 }}>
          <T variant="label">{greeting()}</T>
          <Card>
            <View style={{ gap: 8 }}>
              <Pill label="Entrenador" tone="accent" />
              <T variant="section">{trainer.name}</T>
              <T color={colors.muted}>Biblioteca, plantilles i seguiment de cada client.</T>
              <Button
                label="Entra com a entrenador"
                onPress={() => {
                  enterTrainer().then(() => router.replace('/entrenador'));
                }}
              />
            </View>
          </Card>
          <T variant="label">Clients</T>
          {snapshot.clients.map((client) => {
            const report = clientReport({
              clientId: client.id,
              today,
              plans: snapshot.plans,
              sessions: snapshot.sessions,
              logs: snapshot.logs,
              exercises: snapshot.exercises,
            });
            return (
              <Pressable
                key={client.id}
                accessibilityRole="button"
                onPress={() => {
                  enterClient(client.id).then(() => router.replace('/client'));
                }}
              >
                <Card>
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <T variant="section">{client.name}</T>
                      <Pill label={report.status === 'al_dia' ? 'Al dia' : 'Endarrerit'} tone={report.status === 'al_dia' ? 'good' : 'warn'} />
                    </View>
                    <T color={colors.muted}>{report.activePlan?.name ?? 'Sense pla actiu'}</T>
                    <TextHint>
                      {report.compliance.due === 0
                        ? 'Encara sense sessions vençudes'
                        : `${report.compliance.percent}% de compliment`}
                    </TextHint>
                  </View>
                </Card>
              </Pressable>
            );
          })}
          <Button label="Reinicia la demostració" tone="ghost" onPress={() => resetDemo()} />
        </View>
      </View>
    </ScrollView>
  );
}

function TextHint({ children }: { children: string }) {
  return <T variant="small" style={{ fontFamily: font.body }}>{children}</T>;
}

function AuthPanel() {
  const { signIn, signUpAsTrainer, signUpAsClient } = useApp();
  const [screen, setScreen] = useState<'login' | 'trainer' | 'client'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const go = (role: 'trainer' | 'client' | undefined) => {
    if (role === 'trainer') router.replace('/entrenador');
    if (role === 'client') router.replace('/client');
  };
  return (
    <Card style={{ gap: 12 }}>
      <T variant="section">{screen === 'login' ? 'Entra' : screen === 'trainer' ? 'Compte d\'entrenador' : 'Compte de client'}</T>
      {screen !== 'login' ? <Field label="Nom" value={name} onChangeText={setName} placeholder="El teu nom" /> : null}
      <Field label="Correu" value={email} onChangeText={setEmail} placeholder="tu@exemple.cat" keyboard="email-address" />
      <Field label="Contrasenya" value={password} onChangeText={setPassword} placeholder="Mínim 6 caràcters" secure />
      {screen === 'client' ? <Field label="Codi d'invitació" value={code} onChangeText={setCode} placeholder="AB12CD" /> : null}
      {screen === 'login' ? (
        <Button label="Entra" disabled={!email.trim() || password.length < 6} onPress={() => { signIn(email, password).then(go); }} />
      ) : null}
      {screen === 'trainer' ? (
        <Button label="Crea el compte" disabled={!name.trim() || !email.trim() || password.length < 6} onPress={() => { signUpAsTrainer(name, email, password).then(go); }} />
      ) : null}
      {screen === 'client' ? (
        <Button label="Crea el compte" disabled={!name.trim() || !email.trim() || password.length < 6 || code.trim().length < 6} onPress={() => { signUpAsClient(name, email, password, code).then(go); }} />
      ) : null}
      <Button label={screen === 'trainer' ? 'Ja tinc compte' : 'Soc entrenador nou'} tone="ghost" onPress={() => setScreen(screen === 'trainer' ? 'login' : 'trainer')} />
      <Button label={screen === 'client' ? 'Ja tinc compte' : 'Tinc un codi d\'invitació'} tone="ghost" onPress={() => setScreen(screen === 'client' ? 'login' : 'client')} />
    </Card>
  );
}
