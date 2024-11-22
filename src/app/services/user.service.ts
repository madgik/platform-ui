import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.interface';
import { map } from "rxjs/operators";


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userUrl = '/services/datacatalogue/user';
  private userRoles: string[] = [];

  constructor(private http: HttpClient) {}

  getUserDetails(): Observable<User> {
    return this.http.get<User>(this.userUrl);
  }

  getUserRoles(): Observable<string[]> {
    if (this.userRoles.length) {
      return new Observable((observer) => observer.next(this.userRoles));
    } else {
      return this.http.get<{ roles: string[] }>(this.userUrl).pipe(
        map((response) => {
          this.userRoles = response.roles || [];
          console.log(this.userRoles);
          return this.userRoles;
        })
      );
    }
  }
}
