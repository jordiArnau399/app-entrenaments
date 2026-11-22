import { useState } from 'react';
import { View } from 'react-native';
import { useApp, useSnapshot } from '../../src/state/store';
import { PageIntro, Screen } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';
import { Button, Card, Field, T } from '../../src/ui/ui';

export default function AdminScreen() {
  const snapshot = useSnapshot();
  const { createTrainerInvite, setPersonStatus, moveClient } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [clientId, setClientId] = useState(snapshot.clients[0]?.id ?? '');
  const [trainerId, setTrainerId] = useState('');
  const trainers = snapshot.trainers.filter((trainer) => trainer.id !== snapshot.settings.userId);
  return (
    <Screen>
      <PageIntro eyebrow="Administració" title="Comptes" detail="Convida entrenadors, atura un compte o mou un client. L’historial de qui l’ha portat es queda a la base de dades." />
      <Card style={{ gap: 10 }}>
        <T variant="section">Convida un entrenador</T>
        <Field label="Nom" value={name} onChangeText={setName} />
        <Field label="Correu" value={email} onChangeText={setEmail} keyboard="email-address" />
        <Button
          label="Crea el codi"
          disabled={!name.trim() || !email.trim()}
          onPress={() => {
            createTrainerInvite(name, email).then((created) => {
              if (created) setCode(created);
            });
          }}
        />
        {code ? <T>Codi d’invitació: {code}. L’entrenador l’escriu a la pàgina d’entrenador.</T> : null}
      </Card>
      <Card style={{ gap: 12 }}>
        <T variant="section">Entrenadors</T>
        {trainers.length === 0 ? <T color={colors.muted}>Encara no n’hi ha cap altre.</T> : null}
        {trainers.map((trainer) => (
          <View key={trainer.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <View>
              <T style={{ fontWeight: '600' }}>{trainer.name}</T>
              <T variant="small">{trainer.email} · {trainer.status === 'inactive' ? 'desactivat' : 'actiu'}</T>
            </View>
            <Button
              label={trainer.status === 'inactive' ? 'Activa' : 'Desactiva'}
              tone="secondary"
              onPress={() => setPersonStatus(trainer.id, trainer.status === 'inactive' ? 'active' : 'inactive')}
            />
          </View>
        ))}
      </Card>
      <Card style={{ gap: 10 }}>
        <T variant="section">Mou un client</T>
        <Field label="Id del client" value={clientId} onChangeText={setClientId} />
        <Field label="Id de l’entrenador nou" value={trainerId} onChangeText={setTrainerId} />
        <T variant="small" color={colors.muted}>
          {snapshot.clients.map((client) => `${client.name} (${client.id})`).join(' · ')}
        </T>
        <Button label="Mou el client" disabled={!clientId || !trainerId} onPress={() => moveClient(clientId, trainerId)} />
      </Card>
    </Screen>
  );
}
