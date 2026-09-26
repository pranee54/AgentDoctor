<?php
use Illuminate\Support\Facades\Route;
Route::get('/dashboard', fn () => view('dashboard'));
Route::post('/login', fn () => redirect('/'));
