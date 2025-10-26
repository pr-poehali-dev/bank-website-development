import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_URLS = {
  auth: 'https://functions.poehali.dev/540c0a89-1c4c-4dcb-9afc-1872b00a8f04',
  cards: 'https://functions.poehali.dev/c073a655-061b-4e8c-a4ae-e79a06696553',
  transactions: 'https://functions.poehali.dev/05d89466-06f4-481b-83fd-36b32614029f'
};

interface User {
  userId: number;
  phone: string;
  isAdmin: boolean;
}

interface CardData {
  id: number;
  card_number: string;
  card_type: string;
  balance: number;
  is_blocked: boolean;
}

interface Transaction {
  id: number;
  amount: number;
  message: string;
  created_at: string;
  from_card: string;
  to_card: string;
  from_user_id: number;
  to_user_id: number;
}

interface CardRequest {
  id: number;
  user_id: number;
  phone: string;
  status: string;
  created_at: string;
}

function Index() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cardRequests, setCardRequests] = useState<CardRequest[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const { toast } = useToast();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authData, setAuthData] = useState({ phone: '', password: '', birthDate: '' });
  const [transferData, setTransferData] = useState({ fromCard: '', toCard: '', amount: '', message: '' });
  const [newCardData, setNewCardData] = useState({ requestId: 0, cardNumber: '', cardType: 'debit' });

  useEffect(() => {
    if (user && !user.isAdmin) {
      fetchUserCards();
      fetchTransactions();
    }
    if (user?.isAdmin) {
      fetchCardRequests();
      fetchAllUsers();
    }
  }, [user]);

  const fetchUserCards = async () => {
    try {
      const response = await fetch(API_URLS.cards, {
        headers: { 'X-User-Id': user!.userId.toString() }
      });
      const data = await response.json();
      setCards(data);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(API_URLS.transactions, {
        headers: { 'X-User-Id': user!.userId.toString() }
      });
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchCardRequests = async () => {
    try {
      const response = await fetch(`${API_URLS.cards}?admin=requests`);
      const data = await response.json();
      setCardRequests(data);
    } catch (error) {
      console.error('Error fetching card requests:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${API_URLS.cards}?admin=users`);
      const data = await response.json();
      setAllUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAuth = async () => {
    try {
      const body = authMode === 'login' 
        ? { action: 'login', phone: authData.phone, password: authData.password }
        : { action: 'register', phone: authData.phone, password: authData.password, birth_date: authData.birthDate };

      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        if (authMode === 'login') {
          setUser({ userId: data.userId, phone: data.phone, isAdmin: data.isAdmin });
          toast({ title: 'Вход выполнен', description: `Добро пожаловать, ${data.phone}` });
        } else {
          toast({ title: 'Регистрация успешна', description: data.message });
        }
        setIsAuthOpen(false);
        setAuthData({ phone: '', password: '', birthDate: '' });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить операцию', variant: 'destructive' });
    }
  };

  const handleTransfer = async () => {
    try {
      const response = await fetch(API_URLS.transactions, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user!.userId.toString()
        },
        body: JSON.stringify({
          fromCard: transferData.fromCard,
          toCard: transferData.toCard,
          amount: parseFloat(transferData.amount),
          message: transferData.message
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Успешно', description: data.message });
        setTransferData({ fromCard: '', toCard: '', amount: '', message: '' });
        fetchUserCards();
        fetchTransactions();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить перевод', variant: 'destructive' });
    }
  };

  const handleApproveCard = async () => {
    try {
      const response = await fetch(API_URLS.cards, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_request',
          requestId: newCardData.requestId,
          cardNumber: newCardData.cardNumber,
          cardType: newCardData.cardType
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Успешно', description: data.message });
        setNewCardData({ requestId: 0, cardNumber: '', cardType: 'debit' });
        fetchCardRequests();
        fetchAllUsers();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать карту', variant: 'destructive' });
    }
  };

  const handleAddBalance = async (cardId: number) => {
    const amount = prompt('Введите сумму пополнения:');
    if (!amount) return;

    try {
      const response = await fetch(API_URLS.cards, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_balance',
          cardId: cardId,
          amount: parseFloat(amount)
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Успешно', description: data.message });
        fetchAllUsers();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось пополнить баланс', variant: 'destructive' });
    }
  };

  const handleToggleBlock = async (cardId: number) => {
    try {
      const response = await fetch(API_URLS.cards, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_block',
          cardId: cardId
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Успешно', description: data.isBlocked ? 'Карта заблокирована' : 'Карта разблокирована' });
        fetchAllUsers();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось изменить статус карты', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Building2" size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Skz-Bank</h1>
          </div>
          
          {!user ? (
            <Button onClick={() => setIsAuthOpen(true)}>
              <Icon name="LogIn" size={18} className="mr-2" />
              Войти
            </Button>
          ) : (
            <div className="flex items-center space-x-3">
              <Badge variant="secondary">{user.phone}</Badge>
              {user.isAdmin && <Badge>Администратор</Badge>}
              <Button variant="outline" onClick={() => setUser(null)}>
                <Icon name="LogOut" size={18} />
              </Button>
            </div>
          )}
        </div>
      </header>

      {!user ? (
        <main className="container mx-auto px-4 py-16">
          <section className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Современный банк для вашего бизнеса</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Skz-Bank — надежный партнер в управлении финансами. Выгодные условия, безопасность и удобство.
            </p>
            <Button size="lg" onClick={() => setIsAuthOpen(true)} className="text-lg px-8 py-6">
              <Icon name="UserPlus" size={20} className="mr-2" />
              Открыть счет
            </Button>
          </section>

          <section className="grid md:grid-cols-2 gap-8 mb-20">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon name="CreditCard" size={28} className="text-primary" />
                </div>
                <CardTitle className="text-2xl">Дебетовая карта</CardTitle>
                <CardDescription className="text-base">Удобные платежи и накопления</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Icon name="Check" size={20} className="text-green-600 mr-2 mt-0.5" />
                    <span>Кэшбэк до 5% на все покупки</span>
                  </li>
                  <li className="flex items-start">
                    <Icon name="Check" size={20} className="text-green-600 mr-2 mt-0.5" />
                    <span>Бесплатное обслуживание карты</span>
                  </li>
                  <li className="flex items-start">
                    <Icon name="Check" size={20} className="text-green-600 mr-2 mt-0.5" />
                    <span>Моментальные переводы</span>
                  </li>
                  <li className="flex items-start">
                    <Icon name="Check" size={20} className="text-green-600 mr-2 mt-0.5" />
                    <span>Процент на остаток до 7% годовых</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon name="Wallet" size={28} className="text-primary" />
                </div>
                <CardTitle className="text-2xl">Кредитная карта</CardTitle>
                <CardDescription className="text-base">Выгодные условия кредитования</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Icon name="Check" size={20} className="text-green-600 mr-2 mt-0.5" />
                    <span>Беспроцентный период до 120 дней</span>
                  </li>
                  <li className="flex items-start">
                    <Icon name="Check" size={20} className="text-green-600 mr-2 mt-0.5" />
                    <span>Лимит до 1 000 000 ₽</span>
                  </li>
                  <li className="flex items-start">
                    <Icon name="Check" size={20} className="text-green-600 mr-2 mt-0.5" />
                    <span>Без скрытых комиссий</span>
                  </li>
                  <li className="flex items-start">
                    <Icon name="Check" size={20} className="text-green-600 mr-2 mt-0.5" />
                    <span>Одобрение за 5 минут</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="bg-white rounded-2xl p-8 shadow-md">
            <h3 className="text-3xl font-bold text-center mb-12">Почему выбирают Skz-Bank</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Shield" size={32} className="text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Безопасность</h4>
                <p className="text-gray-600">Современные технологии защиты данных и средств</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Zap" size={32} className="text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Скорость</h4>
                <p className="text-gray-600">Моментальные переводы между клиентами банка</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="HeadphonesIcon" size={32} className="text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Поддержка 24/7</h4>
                <p className="text-gray-600">Всегда готовы помочь в решении любых вопросов</p>
              </div>
            </div>
          </section>
        </main>
      ) : user.isAdmin ? (
        <main className="container mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold mb-6">Панель администратора</h2>
          
          <Tabs defaultValue="requests" className="space-y-6">
            <TabsList>
              <TabsTrigger value="requests">Заявки на карты</TabsTrigger>
              <TabsTrigger value="users">Управление пользователями</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="space-y-4">
              {cardRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    Нет новых заявок на создание карт
                  </CardContent>
                </Card>
              ) : (
                cardRequests.map(request => (
                  <Card key={request.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">Заявка #{request.id}</CardTitle>
                      <CardDescription>Телефон: {request.phone}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`card-number-${request.id}`}>Номер карты</Label>
                            <Input
                              id={`card-number-${request.id}`}
                              placeholder="1234 5678 9012 3456"
                              value={newCardData.requestId === request.id ? newCardData.cardNumber : ''}
                              onChange={(e) => setNewCardData({ ...newCardData, requestId: request.id, cardNumber: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`card-type-${request.id}`}>Тип карты</Label>
                            <select
                              id={`card-type-${request.id}`}
                              className="w-full h-10 px-3 rounded-md border bg-background"
                              value={newCardData.requestId === request.id ? newCardData.cardType : 'debit'}
                              onChange={(e) => setNewCardData({ ...newCardData, requestId: request.id, cardType: e.target.value })}
                            >
                              <option value="debit">Дебетовая</option>
                              <option value="credit">Кредитная</option>
                            </select>
                          </div>
                        </div>
                        <Button onClick={handleApproveCard} disabled={newCardData.requestId !== request.id || !newCardData.cardNumber}>
                          <Icon name="CheckCircle" size={18} className="mr-2" />
                          Одобрить заявку
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              {allUsers.map(user => (
                <Card key={user.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{user.phone}</CardTitle>
                    <CardDescription>ID пользователя: {user.id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user.card_id ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{user.card_number}</p>
                            <p className="text-sm text-gray-600">
                              {user.card_type === 'debit' ? 'Дебетовая' : 'Кредитная'} карта
                            </p>
                          </div>
                          <Badge variant={user.is_blocked ? 'destructive' : 'default'}>
                            {user.is_blocked ? 'Заблокирована' : 'Активна'}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold">{Number(user.balance || 0).toFixed(2)} ₽</p>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => handleAddBalance(user.card_id)}>
                            <Icon name="Plus" size={16} className="mr-1" />
                            Пополнить
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggleBlock(user.card_id)}>
                            <Icon name={user.is_blocked ? 'Unlock' : 'Lock'} size={16} className="mr-1" />
                            {user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">Карта не создана</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </main>
      ) : (
        <main className="container mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold mb-6">Личный кабинет</h2>
          
          <Tabs defaultValue="cards" className="space-y-6">
            <TabsList>
              <TabsTrigger value="cards">Мои карты</TabsTrigger>
              <TabsTrigger value="transfer">Переводы</TabsTrigger>
              <TabsTrigger value="history">История</TabsTrigger>
            </TabsList>

            <TabsContent value="cards" className="space-y-4">
              {cards.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    <Icon name="CreditCard" size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>У вас пока нет карт. Ожидайте одобрения заявки администратором.</p>
                  </CardContent>
                </Card>
              ) : (
                cards.map(card => (
                  <Card key={card.id} className={card.is_blocked ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{card.card_number}</CardTitle>
                        <Badge variant={card.is_blocked ? 'destructive' : 'default'}>
                          {card.is_blocked ? 'Заблокирована' : 'Активна'}
                        </Badge>
                      </div>
                      <CardDescription>
                        {card.card_type === 'debit' ? 'Дебетовая' : 'Кредитная'} карта
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{card.balance.toFixed(2)} ₽</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="transfer">
              <Card>
                <CardHeader>
                  <CardTitle>Перевод другому пользователю</CardTitle>
                  <CardDescription>
                    Переводы по СБП временно недоступны. Доступны только переводы между клиентами Skz-Bank.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="from-card">С карты</Label>
                    <select
                      id="from-card"
                      className="w-full h-10 px-3 rounded-md border bg-background"
                      value={transferData.fromCard}
                      onChange={(e) => setTransferData({ ...transferData, fromCard: e.target.value })}
                    >
                      <option value="">Выберите карту</option>
                      {cards.filter(c => !c.is_blocked).map(card => (
                        <option key={card.id} value={card.card_number}>
                          {card.card_number} ({card.balance.toFixed(2)} ₽)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="to-card">На карту</Label>
                    <Input
                      id="to-card"
                      placeholder="1234 5678 9012 3456"
                      value={transferData.toCard}
                      onChange={(e) => setTransferData({ ...transferData, toCard: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="amount">Сумма</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="1000"
                      value={transferData.amount}
                      onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Сообщение</Label>
                    <Textarea
                      id="message"
                      placeholder="Назначение платежа"
                      value={transferData.message}
                      onChange={(e) => setTransferData({ ...transferData, message: e.target.value })}
                    />
                  </div>

                  <Button onClick={handleTransfer} className="w-full">
                    <Icon name="Send" size={18} className="mr-2" />
                    Выполнить перевод
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {transactions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    История транзакций пуста
                  </CardContent>
                </Card>
              ) : (
                transactions.map(tx => (
                  <Card key={tx.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.from_user_id === user.userId ? 'bg-red-100' : 'bg-green-100'
                          }`}>
                            <Icon 
                              name={tx.from_user_id === user.userId ? 'ArrowUpRight' : 'ArrowDownLeft'} 
                              size={20} 
                              className={tx.from_user_id === user.userId ? 'text-red-600' : 'text-green-600'}
                            />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {tx.from_user_id === user.userId ? 'Исходящий перевод' : 'Входящий перевод'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {tx.from_user_id === user.userId ? `На ${tx.to_card}` : `От ${tx.from_card}`}
                            </p>
                            {tx.message && <p className="text-sm text-gray-500 mt-1">{tx.message}</p>}
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(tx.created_at).toLocaleString('ru-RU')}
                            </p>
                          </div>
                        </div>
                        <p className={`text-lg font-bold ${
                          tx.from_user_id === user.userId ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {tx.from_user_id === user.userId ? '-' : '+'}{tx.amount.toFixed(2)} ₽
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </main>
      )}

      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{authMode === 'login' ? 'Вход в систему' : 'Регистрация'}</DialogTitle>
            <DialogDescription>
              {authMode === 'login' 
                ? 'Введите номер телефона и пароль для входа' 
                : 'Создайте аккаунт для работы с банком (от 14 лет)'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Номер телефона</Label>
              <Input
                id="phone"
                placeholder="+79001234567"
                value={authData.phone}
                onChange={(e) => setAuthData({ ...authData, phone: e.target.value })}
              />
            </div>

            {authMode === 'register' && (
              <div>
                <Label htmlFor="birth-date">Дата рождения</Label>
                <Input
                  id="birth-date"
                  type="date"
                  value={authData.birthDate}
                  onChange={(e) => setAuthData({ ...authData, birthDate: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={authData.password}
                onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
              />
            </div>

            <Button onClick={handleAuth} className="w-full">
              {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>

            <Separator />

            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Index;