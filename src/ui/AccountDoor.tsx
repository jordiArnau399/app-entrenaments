import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLIENT_SITE, TRAINER_SITE, type Door } from '../domain/entry';
import { useApp } from '../state/store';
import { colors } from './theme';
import { Button, Card, Field, Mark, Notice, T } from './ui';

export function AccountForm({ audience }: { audience: Door }) {
  const { signIn, signUpAsTrainer, signUpAsClient, notice } = useApp();
  const [screen, setScreen] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const go = (role: Door | undefined) => {
    if (role !== audience) return;
    router.replace(audience === 'trainer' ? '/entrenador' : '/client');
  };
  return (
    <Card style={{ gap: 12 }}>
      <Notice message={notice} />
      <T variant="section">{screen === 'login' ? 'Entra' : audience === 'trainer' ? 'Compte d’entrenador' : 'Compte de client'}</T>
      {screen === 'signup' ? <Field label="Nom" value={name} onChangeText={setName} placeholder="El teu nom" /> : null}
      <Field label="Correu" value={email} onChangeText={setEmail} placeholder="tu@exemple.cat" keyboard="email-address" />
      <Field label="Contrasenya" value={password} onChangeText={setPassword} placeholder="Mínim 6 caràcters" secure />
      {audience === 'client' && screen === 'signup' ? <Field label="Codi d'invitació" value={code} onChangeText={setCode} placeholder="AB12CD" /> : null}
      {screen === 'login' ? (
        <Button label="Entra" disabled={!email.trim() || password.length < 6} onPress={() => { signIn(email, password).then(go); }} />
      ) : null}
      {screen === 'signup' && audience === 'trainer' ? (
        <Button label="Crea el compte" disabled={!name.trim() || !email.trim() || password.length < 6} onPress={() => { signUpAsTrainer(name, email, password).then(go); }} />
      ) : null}
      {screen === 'signup' && audience === 'client' ? (
        <Button label="Crea el compte" disabled={!name.trim() || !email.trim() || password.length < 6 || code.trim().length < 6} onPress={() => { signUpAsClient(name, email, password, code).then(go); }} />
      ) : null}
      {screen === 'login' ? (
        <Button
          label={audience === 'client' ? 'Tinc un codi d’invitació' : 'Soc entrenador nou'}
          tone="ghost"
          onPress={() => setScreen('signup')}
        />
      ) : (
        <Button label="Ja tinc compte" tone="ghost" onPress={() => setScreen('login')} />
      )}
    </Card>
  );
}

export function WrongDoor({ page }: { page: Door }) {
  const { signOutAccount } = useApp();
  const trainerHere = page === 'client';
  const url = trainerHere ? TRAINER_SITE : CLIENT_SITE;
  return (
    <DoorFrame>
      <T variant="title">{trainerHere ? 'Aquest compte és d’entrenador' : 'Aquest compte és de client'}</T>
      <T color={colors.muted}>
        {trainerHere
          ? 'Els clients entren en aquesta pàgina. El teu accés és aquest:'
          : 'Els entrenadors entren en aquesta pàgina. El teu pla és aquest:'}
      </T>
      <T>{url}</T>
      <Button
        label={trainerHere ? 'Ves a la pàgina d’entrenador' : 'Ves al teu pla'}
        onPress={() => router.replace(trainerHere ? '/entrenador' : '/')}
      />
      <Button label="Tanca la sessió" tone="secondary" onPress={() => { signOutAccount().then(() => router.replace(page === 'trainer' ? '/entrenador' : '/')); }} />
    </DoorFrame>
  );
}

export function DoorFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, paddingTop: insets.top + 36, paddingBottom: insets.bottom + 36 }}>
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: 16 }}>
        <Mark size={52} />
        <T variant="display">Ritme</T>
        {children}
      </View>
    </ScrollView>
  );
}
