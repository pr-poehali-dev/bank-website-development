'''
Business: Money transfers between Skz-Bank users
Args: event - dict with httpMethod, body, queryStringParameters, headers
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with transaction result or history
'''

import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    headers = event.get('headers', {})
    user_id = headers.get('x-user-id') or headers.get('X-User-Id')
    
    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            cur.execute(
                '''SELECT t.id, t.amount, t.message, t.created_at,
                   c1.card_number as from_card, c2.card_number as to_card,
                   c1.user_id as from_user_id, c2.user_id as to_user_id
                   FROM transactions t
                   JOIN cards c1 ON t.from_card_id = c1.id
                   JOIN cards c2 ON t.to_card_id = c2.id
                   WHERE c1.user_id = %s OR c2.user_id = %s
                   ORDER BY t.created_at DESC
                   LIMIT 50''',
                (user_id, user_id)
            )
            transactions = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps([dict(t) for t in transactions], default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            from_card_number = body_data.get('fromCard', '')
            to_card_number = body_data.get('toCard', '')
            amount = float(body_data.get('amount', 0))
            message = body_data.get('message', '')
            
            if amount <= 0:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Сумма должна быть больше 0'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "SELECT id, balance, is_blocked, user_id FROM cards WHERE card_number = %s",
                (from_card_number,)
            )
            from_card = cur.fetchone()
            
            if not from_card:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Карта отправителя не найдена'}),
                    'isBase64Encoded': False
                }
            
            if from_card['is_blocked']:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Карта заблокирована'}),
                    'isBase64Encoded': False
                }
            
            if from_card['balance'] < amount:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Недостаточно средств'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "SELECT id, is_blocked FROM cards WHERE card_number = %s",
                (to_card_number,)
            )
            to_card = cur.fetchone()
            
            if not to_card:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Карта получателя не найдена'}),
                    'isBase64Encoded': False
                }
            
            if to_card['is_blocked']:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Карта получателя заблокирована'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "UPDATE cards SET balance = balance - %s WHERE id = %s",
                (amount, from_card['id'])
            )
            
            cur.execute(
                "UPDATE cards SET balance = balance + %s WHERE id = %s",
                (amount, to_card['id'])
            )
            
            cur.execute(
                "INSERT INTO transactions (from_card_id, to_card_id, amount, message) VALUES (%s, %s, %s, %s)",
                (from_card['id'], to_card['id'], amount, message)
            )
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Перевод выполнен успешно'}),
                'isBase64Encoded': False
            }
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
