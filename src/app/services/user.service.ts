import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {User} from "../interfaces/user.interface";


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userUrl = '/services/datacatalogue/user';

  constructor(private http: HttpClient) {}

  getUserDetails(): Observable<User> {
    return this.http.get<User>(this.userUrl);
  }
}
