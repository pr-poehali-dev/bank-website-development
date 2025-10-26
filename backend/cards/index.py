'''
Business: Card management for users and admin operations
Args: event - dict with httpMethod, body, queryStringParameters, headers
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with card data or operation result
'''

import json
import os
import random
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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
            params = event.get('queryStringParameters', {}) or {}
            
            if params.get('admin') == 'requests':
                cur.execute(
                    '''SELECT cr.id, cr.user_id, cr.status, cr.created_at, u.phone 
                       FROM card_requests cr 
                       JOIN users u ON cr.user_id = u.id 
                       WHERE cr.status = 'pending' 
                       ORDER BY cr.created_at DESC'''
                )
                requests = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(r) for r in requests], default=str),
                    'isBase64Encoded': False
                }
            
            elif params.get('admin') == 'users':
                cur.execute(
                    '''SELECT u.id, u.phone, u.is_admin, 
                       c.id as card_id, c.card_number, c.card_type, c.balance, c.is_blocked
                       FROM users u
                       LEFT JOIN cards c ON u.id = c.user_id
                       WHERE u.is_admin = false
                       ORDER BY u.id'''
                )
                users_data = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(r) for r in users_data], default=str),
                    'isBase64Encoded': False
                }
            
            else:
                cur.execute(
                    "SELECT id, card_number, card_type, balance, is_blocked FROM cards WHERE user_id = %s",
                    (user_id,)
                )
                cards = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(c) for c in cards], default=str),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'approve_request':
                request_id = body_data.get('requestId')
                card_type = body_data.get('cardType', 'debit')
                card_number = body_data.get('cardNumber', '')
                
                cur.execute("SELECT user_id FROM card_requests WHERE id = %s", (request_id,))
                request = cur.fetchone()
                
                if not request:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Request not found'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "INSERT INTO cards (user_id, card_number, card_type, balance) VALUES (%s, %s, %s, 0)",
                    (request['user_id'], card_number, card_type)
                )
                
                cur.execute(
                    "UPDATE card_requests SET status = 'approved', processed_at = NOW() WHERE id = %s",
                    (request_id,)
                )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Карта создана'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'add_balance':
                card_id = body_data.get('cardId')
                amount = float(body_data.get('amount', 0))
                
                cur.execute(
                    "UPDATE cards SET balance = balance + %s WHERE id = %s",
                    (amount, card_id)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Баланс пополнен'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'toggle_block':
                card_id = body_data.get('cardId')
                
                cur.execute(
                    "UPDATE cards SET is_blocked = NOT is_blocked WHERE id = %s RETURNING is_blocked",
                    (card_id,)
                )
                result = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'isBlocked': result['is_blocked']}),
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
