'''
Business: User authentication and registration for Skz-Bank
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with user data or error
'''

import json
import os
from datetime import datetime
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
    
    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'register':
                phone = body_data.get('phone', '')
                birth_date = body_data.get('birth_date', '')
                password = body_data.get('password', '')
                
                birth_dt = datetime.strptime(birth_date, '%Y-%m-%d')
                age = (datetime.now() - birth_dt).days / 365.25
                
                if age < 14:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Регистрация доступна с 14 лет'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "INSERT INTO users (phone, birth_date, password_hash) VALUES (%s, %s, %s) RETURNING id",
                    (phone, birth_date, password)
                )
                user_id = cur.fetchone()['id']
                
                cur.execute(
                    "INSERT INTO card_requests (user_id, status) VALUES (%s, 'pending')",
                    (user_id,)
                )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'userId': user_id, 'message': 'Заявка отправлена администратору'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'login':
                phone = body_data.get('phone', '')
                password = body_data.get('password', '')
                
                cur.execute(
                    "SELECT id, phone, is_admin FROM users WHERE phone = %s AND password_hash = %s",
                    (phone, password)
                )
                user = cur.fetchone()
                
                if not user:
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Неверный телефон или пароль'}),
                        'isBase64Encoded': False
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'userId': user['id'],
                        'phone': user['phone'],
                        'isAdmin': user['is_admin']
                    }),
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
